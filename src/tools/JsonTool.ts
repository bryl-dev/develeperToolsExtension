import {
  button,
  copyButton,
  errorText,
  field,
  note,
  output,
  row,
  setError,
  textarea,
  textInput,
  wrapper
} from "../ui/kit"

export function JsonTool(): HTMLElement {
  const input = textarea('{"hello":"world"}', 5)
  const result = output()

  const indent = textInput("2", "2")
  indent.type = "number"
  indent.min = "0"
  indent.max = "8"
  indent.className = "input indent-input"

  const error = errorText()
  setError(error, null)

  const stats = note("")
  stats.style.display = "none"

  type ParseResult = { ok: true; value: unknown } | { ok: false }

  function parse(): ParseResult {
    try {
      const value = JSON.parse(input.value)
      setError(error, null)
      return { ok: true, value }
    } catch (e) {
      result.textContent = ""
      stats.style.display = "none"
      setError(error, describeJsonError(e, input.value))
      return { ok: false }
    }
  }

  function render(text: string, value: unknown) {
    result.textContent = text
    stats.textContent = `${text.length} characters · ${describeShape(value)}`
    stats.style.display = ""
  }

  function indentWidth(): number {
    return Math.min(Math.max(parseInt(indent.value, 10) || 0, 0), 8)
  }

  const formatBtn = button(
    "Format",
    () => {
      const parsed = parse()
      if (!parsed.ok) return
      render(JSON.stringify(parsed.value, null, indentWidth()), parsed.value)
    },
    "primary"
  )

  const minifyBtn = button("Minify", () => {
    const parsed = parse()
    if (!parsed.ok) return
    render(JSON.stringify(parsed.value), parsed.value)
  })

  const sortBtn = button("Format + sort keys", () => {
    const parsed = parse()
    if (!parsed.ok) return
    render(JSON.stringify(sortKeys(parsed.value), null, indentWidth()), parsed.value)
  })

  return wrapper(
    field("JSON", input),
    row(formatBtn, minifyBtn, sortBtn, field("Indent", indent), copyButton(() => result.textContent ?? "", "Copy")),
    error,
    stats,
    field("Result", result)
  )
}

/**
 * V8 reports a character offset in the message; translate it into a line and
 * column plus the offending snippet, which is far more useful than "Invalid JSON".
 */
function describeJsonError(e: unknown, source: string): string {
  const base = e instanceof Error ? e.message : "Invalid JSON"
  const match = /position (\d+)/.exec(base)
  if (!match) return base

  const offset = Number(match[1])
  const before = source.slice(0, offset)
  const line = before.split("\n").length
  const column = offset - before.lastIndexOf("\n")
  const snippet = source.slice(Math.max(0, offset - 20), offset + 20).replace(/\n/g, "\\n")

  return `${base}\nLine ${line}, column ${column} — near: …${snippet}…`
}

function describeShape(value: unknown): string {
  if (Array.isArray(value)) return `array of ${value.length}`
  if (value === null) return "null"
  if (typeof value === "object") return `object with ${Object.keys(value).length} key(s)`
  return typeof value
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value === null || typeof value !== "object") return value

  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((value as Record<string, unknown>)[key])
  }
  return sorted
}
