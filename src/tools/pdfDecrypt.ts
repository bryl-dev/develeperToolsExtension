import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFRawStream,
  PDFRef,
  PDFString
} from "pdf-lib"
import {
  CipherMethod,
  EncryptionParams,
  computeFileKey,
  decryptBytes
} from "./pdfCrypto"

export type DecryptOutcome =
  | { status: "not-encrypted" }
  | { status: "decrypted" }
  | { status: "needs-password" }
  | { status: "unsupported"; reason: string }

function toBytes(value: PDFObject | undefined): Uint8Array | undefined {
  if (value instanceof PDFHexString || value instanceof PDFString) {
    return new Uint8Array(value.asBytes())
  }
  return undefined
}

function cipherFromName(name: string): CipherMethod | null {
  switch (name) {
    case "V2":
      return "rc4"
    case "AESV2":
      return "aesv2"
    case "AESV3":
      return "aesv3"
    case "None":
      return "none"
    default:
      return null
  }
}

/** Reads and normalises the /Encrypt dictionary, if the document has one. */
export function readEncryptionParams(
  doc: PDFDocument
): { params: EncryptionParams; encryptRef?: PDFRef } | { error: string } | null {
  const encryptEntry = doc.context.trailerInfo.Encrypt
  if (!encryptEntry) return null

  const encryptRef = encryptEntry instanceof PDFRef ? encryptEntry : undefined
  const dict = doc.context.lookup(encryptEntry, PDFDict)
  if (!dict) return { error: "The encryption dictionary is missing." }

  const filter = dict.get(PDFName.of("Filter"))
  if (filter instanceof PDFName && filter.asString() !== "/Standard") {
    return { error: `Unsupported security handler ${filter.asString()}.` }
  }

  const version = (dict.get(PDFName.of("V")) as PDFNumber | undefined)?.asNumber() ?? 0
  const revision = (dict.get(PDFName.of("R")) as PDFNumber | undefined)?.asNumber() ?? 0
  const bitLength = (dict.get(PDFName.of("Length")) as PDFNumber | undefined)?.asNumber() ?? 40
  const permissions = (dict.get(PDFName.of("P")) as PDFNumber | undefined)?.asNumber() ?? 0

  const ownerKey = toBytes(dict.get(PDFName.of("O")))
  const userKey = toBytes(dict.get(PDFName.of("U")))
  if (!ownerKey || !userKey) return { error: "The encryption dictionary is incomplete." }

  const encryptMetadataEntry = dict.get(PDFName.of("EncryptMetadata"))
  const encryptMetadata =
    encryptMetadataEntry === undefined ? true : String(encryptMetadataEntry) !== "false"

  let streamCipher: CipherMethod = "rc4"
  let stringCipher: CipherMethod = "rc4"
  let keyLengthBytes = Math.floor(bitLength / 8) || 5

  if (version >= 4) {
    // V4/V5 name their ciphers through the crypt-filter dictionaries.
    const cryptFilters = dict.lookupMaybe(PDFName.of("CF"), PDFDict)
    const resolve = (which: "StmF" | "StrF"): CipherMethod => {
      const filterName = dict.get(PDFName.of(which))
      const name = filterName instanceof PDFName ? filterName.asString().replace(/^\//, "") : "Identity"
      if (name === "Identity") return "none"

      const cf = cryptFilters?.lookupMaybe(PDFName.of(name), PDFDict)
      const cfm = cf?.get(PDFName.of("CFM"))
      const method = cfm instanceof PDFName ? cipherFromName(cfm.asString().replace(/^\//, "")) : null
      if (cf) {
        const cfLength = (cf.get(PDFName.of("Length")) as PDFNumber | undefined)?.asNumber()
        if (cfLength) keyLengthBytes = cfLength > 40 ? Math.floor(cfLength / 8) : cfLength
      }
      return method ?? "rc4"
    }
    streamCipher = resolve("StmF")
    stringCipher = resolve("StrF")
  }

  if (version === 5 || revision >= 5) {
    streamCipher = "aesv3"
    stringCipher = "aesv3"
    keyLengthBytes = 32
  } else if (version === 1) {
    keyLengthBytes = 5
  }

  const idArray = doc.context.trailerInfo.ID
  let firstDocId: Uint8Array = new Uint8Array(0)
  if (idArray instanceof PDFArray && idArray.size() > 0) {
    firstDocId = toBytes(idArray.lookup(0)) ?? new Uint8Array(0)
  }

  return {
    encryptRef,
    params: {
      revision,
      version,
      keyLengthBytes,
      ownerKey,
      userKey,
      ownerEncrypted: toBytes(dict.get(PDFName.of("OE"))),
      userEncrypted: toBytes(dict.get(PDFName.of("UE"))),
      permissions,
      encryptMetadata,
      streamCipher,
      stringCipher,
      firstDocId
    }
  }
}

/**
 * Decrypts every string and stream in the document in place and clears the
 * /Encrypt entry, so the result can be saved or copied from as normal.
 */
export async function decryptDocument(doc: PDFDocument, password = ""): Promise<DecryptOutcome> {
  const read = readEncryptionParams(doc)
  if (read === null) return { status: "not-encrypted" }
  if ("error" in read) return { status: "unsupported", reason: read.error }

  const { params, encryptRef } = read
  if (params.revision < 2 || params.revision > 6) {
    return { status: "unsupported", reason: `Unsupported encryption revision ${params.revision}.` }
  }

  const fileKey = await computeFileKey(params, password)
  if (!fileKey) return { status: "needs-password" }

  const metadataRef = doc.catalog.get(PDFName.of("Metadata"))

  for (const [ref, object] of doc.context.enumerateIndirectObjects()) {
    // The encryption dictionary itself is never encrypted.
    if (encryptRef && ref.objectNumber === encryptRef.objectNumber) continue

    if (object instanceof PDFRawStream) {
      const type = object.dict.get(PDFName.of("Type"))
      const typeName = type instanceof PDFName ? type.asString() : ""
      // Cross-reference streams are always stored in the clear.
      if (typeName === "/XRef") continue
      if (
        !params.encryptMetadata &&
        metadataRef instanceof PDFRef &&
        ref.objectNumber === metadataRef.objectNumber
      ) {
        continue
      }

      const decrypted = await decryptBytes(
        object.contents,
        fileKey,
        ref.objectNumber,
        ref.generationNumber,
        params.streamCipher
      )
      await decryptStringsIn(object.dict, ref, fileKey, params)
      object.dict.set(PDFName.of("Length"), PDFNumber.of(decrypted.length))
      // `contents` is read-only, so swap in a fresh stream carrying the same dict.
      doc.context.assign(ref, PDFRawStream.of(object.dict, decrypted))
      continue
    }

    await decryptStringsIn(object, ref, fileKey, params)
  }

  doc.context.trailerInfo.Encrypt = undefined
  return { status: "decrypted" }
}

/** Walks direct (non-reference) children, replacing encrypted string values. */
async function decryptStringsIn(
  object: PDFObject,
  ref: PDFRef,
  fileKey: Uint8Array,
  params: EncryptionParams
): Promise<void> {
  if (params.stringCipher === "none") return

  if (object instanceof PDFDict) {
    for (const [key, value] of object.entries()) {
      const replacement = await decryptStringValue(value, ref, fileKey, params)
      if (replacement) object.set(key, replacement)
      else await decryptStringsIn(value, ref, fileKey, params)
    }
    return
  }

  if (object instanceof PDFArray) {
    for (let i = 0; i < object.size(); i++) {
      const value = object.get(i)
      const replacement = await decryptStringValue(value, ref, fileKey, params)
      if (replacement) object.set(i, replacement)
      else await decryptStringsIn(value, ref, fileKey, params)
    }
  }
}

async function decryptStringValue(
  value: PDFObject,
  ref: PDFRef,
  fileKey: Uint8Array,
  params: EncryptionParams
): Promise<PDFHexString | undefined> {
  if (!(value instanceof PDFString) && !(value instanceof PDFHexString)) return undefined

  const decrypted = await decryptBytes(
    new Uint8Array(value.asBytes()),
    fileKey,
    ref.objectNumber,
    ref.generationNumber,
    params.stringCipher
  )
  // Re-emit as hex so arbitrary bytes survive without escaping concerns.
  let hex = ""
  for (const byte of decrypted) hex += byte.toString(16).padStart(2, "0")
  return PDFHexString.of(hex)
}
