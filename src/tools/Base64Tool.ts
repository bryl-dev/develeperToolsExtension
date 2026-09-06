import {
  button,
  copyButton,
  errorText,
  field,
  formatBytes,
  note,
  row,
  setError,
  textarea,
  wrapper
} from "../ui/kit"

export function Base64Tool(): HTMLElement {
  const input = textarea("Text, or Base64 to decode…", 5)
  const result = textarea("", 5)
  result.readOnly = true

  const error = errorText()
  setError(error, null)

  const fileInput = document.createElement("input")
  fileInput.type = "file"
  fileInput.className = "input"

  const fileNote = note("")
  fileNote.style.display = "none"

  const encodeBtn = button(
    "Encode",
    () => {
      try {
        result.value = encodeUtf8Base64(input.value)
        setError(error, null)
      } catch (e) {
        result.value = ""
        setError(error, message(e))
      }
    },
    "primary"
  )

  const decodeBtn = button("Decode", () => {
    try {
      result.value = decodeUtf8Base64(input.value)
      setError(error, null)
    } catch {
      result.value = ""
      setError(error, "Not valid Base64.")
    }
  })

  const swapBtn = button("Use as input", () => {
    input.value = result.value
    result.value = ""
  })

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0]
    if (!file) return
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      result.value = bytesToBase64(bytes)
      fileNote.textContent = `${file.name} — ${formatBytes(file.size)} encoded as Base64.`
      fileNote.style.display = ""
      setError(error, null)
    } catch (e) {
      setError(error, message(e))
    }
  })

  return wrapper(
    field("Input", input),
    row(encodeBtn, decodeBtn, swapBtn, copyButton(() => result.value, "Copy result")),
    error,
    field("Result", result),
    field("Or encode a file", fileInput),
    fileNote
  )
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** btoa() throws on any code point above 0xFF, so encode to UTF-8 bytes first. */
function encodeUtf8Base64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text))
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function decodeUtf8Base64(value: string): string {
  const bytes = base64ToBytes(value)
  return new TextDecoder("utf-8").decode(bytes)
}

/** Accepts standard and URL-safe alphabets, with or without padding. */
export function base64ToBytes(value: string): Uint8Array {
  let normalized = value.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/")
  const remainder = normalized.length % 4
  if (remainder === 2) normalized += "=="
  else if (remainder === 3) normalized += "="
  else if (remainder === 1) throw new Error("Invalid Base64 length.")

  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
