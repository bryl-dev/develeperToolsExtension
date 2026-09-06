/**
 * Decryption for the PDF "Standard" security handler.
 *
 * pdf-lib can parse an encrypted document but never decrypts it, so copying
 * pages out of one yields ciphertext in an unencrypted container — which
 * viewers render as blank pages. This module recovers the file encryption key
 * (for the common case of an empty user password, i.e. documents that merely
 * restrict permissions) and decrypts every string and stream in place.
 *
 * Supports revisions 2-6: RC4 40/128-bit, AES-128 (AESV2) and AES-256 (AESV3).
 */

const PAD = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a
])

export type CipherMethod = "rc4" | "aesv2" | "aesv3" | "none"

export interface EncryptionParams {
  revision: number
  version: number
  keyLengthBytes: number
  ownerKey: Uint8Array
  userKey: Uint8Array
  ownerEncrypted?: Uint8Array
  userEncrypted?: Uint8Array
  permissions: number
  encryptMetadata: boolean
  streamCipher: CipherMethod
  stringCipher: CipherMethod
  firstDocId: Uint8Array
}

// --- Primitives ----------------------------------------------------------

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** RC4 is symmetric, so this both encrypts and decrypts. */
export function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const s = new Uint8Array(256)
  for (let i = 0; i < 256; i++) s[i] = i

  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 0xff
    const t = s[i]
    s[i] = s[j]
    s[j] = t
  }

  const out = new Uint8Array(data.length)
  let a = 0
  let b = 0
  for (let k = 0; k < data.length; k++) {
    a = (a + 1) & 0xff
    b = (b + s[a]) & 0xff
    const t = s[a]
    s[a] = s[b]
    s[b] = t
    out[k] = data[k] ^ s[(s[a] + s[b]) & 0xff]
  }
  return out
}

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
]

const MD5_K = new Uint32Array(64)
for (let i = 0; i < 64; i++) MD5_K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32)

/** Web Crypto has no MD5, but revisions 2-4 of the handler require it. */
export function md5(input: Uint8Array): Uint8Array {
  const bitLength = input.length * 8
  const paddedLength = (((input.length + 8) >> 6) + 1) << 6
  const buffer = new Uint8Array(paddedLength)
  buffer.set(input)
  buffer[input.length] = 0x80

  const view = new DataView(buffer.buffer)
  view.setUint32(paddedLength - 8, bitLength >>> 0, true)
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 2 ** 32), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  const chunk = new Uint32Array(16)
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) chunk[i] = view.getUint32(offset + i * 4, true)

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let i = 0; i < 64; i++) {
      let f: number
      let g: number
      if (i < 16) {
        f = (b & c) | (~b & d)
        g = i
      } else if (i < 32) {
        f = (d & b) | (~d & c)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        f = b ^ c ^ d
        g = (3 * i + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * i) % 16
      }

      const tmp = d
      d = c
      c = b
      const sum = (a + f + MD5_K[i] + chunk[g]) >>> 0
      const rotated = (sum << MD5_S[i]) | (sum >>> (32 - MD5_S[i]))
      b = (b + rotated) >>> 0
      a = tmp
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  const out = new Uint8Array(16)
  const outView = new DataView(out.buffer)
  outView.setUint32(0, a0, true)
  outView.setUint32(4, b0, true)
  outView.setUint32(8, c0, true)
  outView.setUint32(12, d0, true)
  return out
}

async function sha(bits: 256 | 384 | 512, data: Uint8Array): Promise<Uint8Array> {
  const buffer = await crypto.subtle.digest(`SHA-${bits}`, data as unknown as BufferSource)
  return new Uint8Array(buffer)
}

async function importAesKey(key: Uint8Array, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", key as unknown as BufferSource, "AES-CBC", false, [usage])
}

/**
 * CBC encryption with no padding. Web Crypto always appends a PKCS#7 block, so
 * we simply drop it; `data` must already be a multiple of the block size.
 */
async function aesEncryptNoPad(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await importAesKey(key, "encrypt")
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: iv as unknown as BufferSource },
    cryptoKey,
    data as unknown as BufferSource
  )
  return new Uint8Array(encrypted, 0, data.length)
}

/**
 * CBC decryption with no padding. Web Crypto insists on stripping a valid
 * PKCS#7 block, so we append one we construct ourselves: encrypting a full
 * padding block in CBC mode with the last ciphertext block as the IV yields
 * exactly the block that decrypts back to that padding.
 */
async function aesDecryptNoPad(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  if (data.length === 0) return new Uint8Array(0)

  const fullPadBlock = new Uint8Array(16).fill(16)
  const lastBlock = data.subarray(data.length - 16)
  const encryptKey = await importAesKey(key, "encrypt")
  const trailer = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-CBC", iv: lastBlock as unknown as BufferSource },
      encryptKey,
      fullPadBlock as unknown as BufferSource
    ),
    0,
    16
  )

  const decryptKey = await importAesKey(key, "decrypt")
  const plain = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: iv as unknown as BufferSource },
    decryptKey,
    concatBytes(data, trailer) as unknown as BufferSource
  )
  return new Uint8Array(plain)
}

/** PDF AES streams carry a leading 16-byte IV and PKCS#7 padding. */
async function aesDecryptStream(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  if (data.length <= 16) return new Uint8Array(0)

  const iv = data.subarray(0, 16)
  let body = data.subarray(16)
  // Trailing garbage past the last whole block cannot be decrypted.
  if (body.length % 16 !== 0) body = body.subarray(0, body.length - (body.length % 16))
  if (body.length === 0) return new Uint8Array(0)

  const plain = await aesDecryptNoPad(key, iv, body)
  const padLength = plain[plain.length - 1]
  if (padLength >= 1 && padLength <= 16 && padLength <= plain.length) {
    return plain.subarray(0, plain.length - padLength)
  }
  return plain
}

// --- Key derivation ------------------------------------------------------

function padPassword(password: Uint8Array): Uint8Array {
  const out = new Uint8Array(32)
  const take = Math.min(password.length, 32)
  out.set(password.subarray(0, take))
  out.set(PAD.subarray(0, 32 - take), take)
  return out
}

function int32le(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setInt32(0, value | 0, true)
  return out
}

/** Algorithm 2: file key for revisions 2-4. */
export function computeLegacyKey(password: Uint8Array, params: EncryptionParams): Uint8Array {
  const parts = [
    padPassword(password),
    params.ownerKey.subarray(0, 32),
    int32le(params.permissions),
    params.firstDocId
  ]
  if (params.revision >= 4 && !params.encryptMetadata) {
    parts.push(new Uint8Array([0xff, 0xff, 0xff, 0xff]))
  }

  let hash = md5(concatBytes(...parts))
  if (params.revision >= 3) {
    for (let i = 0; i < 50; i++) hash = md5(hash.subarray(0, params.keyLengthBytes))
  }
  return hash.subarray(0, params.keyLengthBytes)
}

/** Algorithms 4 and 5: the /U value implied by a candidate key. */
function computeUserKey(fileKey: Uint8Array, params: EncryptionParams): Uint8Array {
  if (params.revision === 2) return rc4(fileKey, PAD)

  let value = md5(concatBytes(PAD, params.firstDocId))
  value = rc4(fileKey, value)
  for (let i = 1; i <= 19; i++) {
    const roundKey = new Uint8Array(fileKey.length)
    for (let k = 0; k < fileKey.length; k++) roundKey[k] = fileKey[k] ^ i
    value = rc4(roundKey, value)
  }
  return value
}

function bytesEqual(a: Uint8Array, b: Uint8Array, length: number): boolean {
  for (let i = 0; i < length; i++) if (a[i] !== b[i]) return false
  return true
}

/** Algorithm 2.B: the iterated hash used by revision 6. */
async function hash2B(password: Uint8Array, salt: Uint8Array, userData: Uint8Array): Promise<Uint8Array> {
  let k = await sha(256, concatBytes(password, salt, userData))

  for (let round = 0; ; round++) {
    const block = concatBytes(password, k, userData)
    const k1 = new Uint8Array(block.length * 64)
    for (let i = 0; i < 64; i++) k1.set(block, i * block.length)

    const e = await aesEncryptNoPad(k.subarray(0, 16), k.subarray(16, 32), k1)

    let sum = 0
    for (let i = 0; i < 16; i++) sum += e[i]
    const which = sum % 3
    k = await sha(which === 0 ? 256 : which === 1 ? 384 : 512, e)

    if (round >= 63 && e[e.length - 1] <= round - 31) break
  }
  return k.subarray(0, 32)
}

async function hashR5R6(
  password: Uint8Array,
  salt: Uint8Array,
  userData: Uint8Array,
  revision: number
): Promise<Uint8Array> {
  if (revision === 5) return sha(256, concatBytes(password, salt, userData))
  return hash2B(password, salt, userData)
}

/**
 * Recovers the file encryption key, trying the user password then the owner
 * password. Returns null when the document needs a real password.
 */
export async function computeFileKey(
  params: EncryptionParams,
  password = ""
): Promise<Uint8Array | null> {
  const passwordBytes = new TextEncoder().encode(password)

  if (params.revision >= 5) {
    const validationSalt = params.userKey.subarray(32, 40)
    const keySalt = params.userKey.subarray(40, 48)

    const check = await hashR5R6(passwordBytes, validationSalt, new Uint8Array(0), params.revision)
    if (bytesEqual(check, params.userKey, 32) && params.userEncrypted) {
      const intermediate = await hashR5R6(passwordBytes, keySalt, new Uint8Array(0), params.revision)
      return aesDecryptNoPad(intermediate, new Uint8Array(16), params.userEncrypted.subarray(0, 32))
    }

    // Try the owner password, whose hash additionally mixes in /U.
    const ownerValidationSalt = params.ownerKey.subarray(32, 40)
    const ownerKeySalt = params.ownerKey.subarray(40, 48)
    const ownerCheck = await hashR5R6(
      passwordBytes,
      ownerValidationSalt,
      params.userKey.subarray(0, 48),
      params.revision
    )
    if (bytesEqual(ownerCheck, params.ownerKey, 32) && params.ownerEncrypted) {
      const intermediate = await hashR5R6(
        passwordBytes,
        ownerKeySalt,
        params.userKey.subarray(0, 48),
        params.revision
      )
      return aesDecryptNoPad(intermediate, new Uint8Array(16), params.ownerEncrypted.subarray(0, 32))
    }
    return null
  }

  const key = computeLegacyKey(passwordBytes, params)
  const expected = computeUserKey(key, params)
  if (bytesEqual(expected, params.userKey, 16)) return key

  // The supplied password may be the owner password: decrypt /O to get the
  // user password, then derive the key from that.
  const ownerCandidate = recoverUserPasswordFromOwner(passwordBytes, params)
  if (ownerCandidate) {
    const ownerKey = computeLegacyKey(ownerCandidate, params)
    if (bytesEqual(computeUserKey(ownerKey, params), params.userKey, 16)) return ownerKey
  }
  return null
}

function recoverUserPasswordFromOwner(
  password: Uint8Array,
  params: EncryptionParams
): Uint8Array | null {
  let hash = md5(padPassword(password))
  if (params.revision >= 3) {
    for (let i = 0; i < 50; i++) hash = md5(hash)
  }
  const rc4Key = hash.subarray(0, params.keyLengthBytes)

  if (params.revision === 2) return rc4(rc4Key, params.ownerKey.subarray(0, 32))

  let value = params.ownerKey.subarray(0, 32)
  for (let i = 19; i >= 0; i--) {
    const roundKey = new Uint8Array(rc4Key.length)
    for (let k = 0; k < rc4Key.length; k++) roundKey[k] = rc4Key[k] ^ i
    value = rc4(roundKey, value)
  }
  return value
}

// --- Per-object decryption ----------------------------------------------

const AES_SALT = new Uint8Array([0x73, 0x41, 0x6c, 0x54]) // "sAlT"

/** Algorithm 1: mixes the object and generation numbers into the file key. */
export function objectKey(
  fileKey: Uint8Array,
  objectNumber: number,
  generation: number,
  method: CipherMethod
): Uint8Array {
  if (method === "aesv3") return fileKey

  const extra = new Uint8Array([
    objectNumber & 0xff,
    (objectNumber >> 8) & 0xff,
    (objectNumber >> 16) & 0xff,
    generation & 0xff,
    (generation >> 8) & 0xff
  ])
  const parts = method === "aesv2" ? [fileKey, extra, AES_SALT] : [fileKey, extra]
  const hash = md5(concatBytes(...parts))
  return hash.subarray(0, Math.min(fileKey.length + 5, 16))
}

export async function decryptBytes(
  data: Uint8Array,
  fileKey: Uint8Array,
  objectNumber: number,
  generation: number,
  method: CipherMethod
): Promise<Uint8Array> {
  if (method === "none") return data
  const key = objectKey(fileKey, objectNumber, generation, method)
  if (method === "rc4") return rc4(key, data)
  return aesDecryptStream(key, data)
}
