import { button, copyButton, field, note, row, select, textInput, textarea, wrapper } from "../ui/kit"

const SHORT_ID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZabcdefghijkmnopqrstuvwxyz-_"

export function UuidTool(): HTMLElement {
  const kind = select([
    { value: "uuid", label: "UUID v4" },
    { value: "uuid-upper", label: "UUID v4 (uppercase)" },
    { value: "uuid-bare", label: "UUID v4 (no dashes)" },
    { value: "short", label: "Short ID (NanoID style)" }
  ])

  const count = textInput("5", "5")
  count.type = "number"
  count.min = "1"
  count.max = "500"

  const length = textInput("21", "21")
  length.type = "number"
  length.min = "4"
  length.max = "64"

  const lengthField = field("Short ID length", length)
  lengthField.style.display = "none"

  const result = textarea("", 8)
  result.readOnly = true

  const summary = note("")

  function generate() {
    const n = clamp(parseInt(count.value, 10) || 1, 1, 500)
    const size = clamp(parseInt(length.value, 10) || 21, 4, 64)

    const values: string[] = []
    for (let i = 0; i < n; i++) values.push(makeId(kind.value, size))

    result.value = values.join("\n")
    result.rows = Math.min(Math.max(values.length, 3), 12)
    summary.textContent = `Generated ${n} value${n === 1 ? "" : "s"}.`
  }

  kind.addEventListener("change", () => {
    lengthField.style.display = kind.value === "short" ? "" : "none"
    generate()
  })
  count.addEventListener("input", generate)
  length.addEventListener("input", generate)

  generate()

  return wrapper(
    field("Type", kind),
    field("How many", count),
    lengthField,
    row(button("Generate", generate, "primary"), copyButton(() => result.value, "Copy all")),
    summary,
    field("Output", result)
  )
}

function makeId(kind: string, size: number): string {
  switch (kind) {
    case "uuid-upper":
      return crypto.randomUUID().toUpperCase()
    case "uuid-bare":
      return crypto.randomUUID().replace(/-/g, "")
    case "short":
      return shortId(size)
    default:
      return crypto.randomUUID()
  }
}

function shortId(size: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  let id = ""
  for (const byte of bytes) id += SHORT_ID_ALPHABET[byte % SHORT_ID_ALPHABET.length]
  return id
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
