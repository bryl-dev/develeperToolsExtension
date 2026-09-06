import {
  button,
  copyButton,
  el,
  errorText,
  field,
  formatBytes,
  note,
  row,
  select,
  setError,
  textarea,
  wrapper
} from "../ui/kit"

const ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const

export function HashTool(): HTMLElement {
  const input = textarea("Text to hash…", 4)
  const algorithm = select(ALGORITHMS.map((a) => ({ value: a, label: a })))
  algorithm.value = "SHA-256"

  const result = el("code", "hash-output", "")
  const error = errorText()
  setError(error, null)

  const source = note("")
  source.style.display = "none"

  const fileInput = el("input", "input")
  fileInput.type = "file"

  async function hashText() {
    try {
      const digest = await digestHex(algorithm.value, new TextEncoder().encode(input.value))
      result.textContent = digest
      source.textContent = `${algorithm.value} of ${input.value.length} character(s).`
      source.style.display = ""
      setError(error, null)
    } catch (e) {
      setError(error, e instanceof Error ? e.message : String(e))
    }
  }

  async function hashFile() {
    const file = fileInput.files?.[0]
    if (!file) {
      setError(error, "Choose a file first.")
      return
    }
    try {
      result.textContent = "Hashing…"
      const bytes = new Uint8Array(await file.arrayBuffer())
      result.textContent = await digestHex(algorithm.value, bytes)
      source.textContent = `${algorithm.value} of ${file.name} (${formatBytes(file.size)}).`
      source.style.display = ""
      setError(error, null)
    } catch (e) {
      result.textContent = ""
      setError(error, e instanceof Error ? e.message : String(e))
    }
  }

  algorithm.addEventListener("change", () => {
    if (fileInput.files?.length) void hashFile()
    else void hashText()
  })
  input.addEventListener("input", () => void hashText())
  fileInput.addEventListener("change", () => void hashFile())

  return wrapper(
    field("Algorithm", algorithm),
    field("Text", input),
    field("Or hash a file", fileInput),
    row(button("Hash text", () => void hashText(), "primary"), copyButton(() => result.textContent ?? "", "Copy digest")),
    error,
    field("Digest", result),
    source
  )
}

async function digestHex(algorithm: string, bytes: Uint8Array): Promise<string> {
  const buffer = await crypto.subtle.digest(algorithm, bytes as unknown as BufferSource)
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("")
}
