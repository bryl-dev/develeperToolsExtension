import { copyButton, el, field, live, note, textarea, wrapper } from "../ui/kit"

type Converter = (words: string[]) => string

const CASES: { label: string; convert: Converter }[] = [
  { label: "camelCase", convert: (w) => w.map((x, i) => (i === 0 ? x : cap(x))).join("") },
  { label: "PascalCase", convert: (w) => w.map(cap).join("") },
  { label: "snake_case", convert: (w) => w.join("_") },
  { label: "SCREAMING_SNAKE", convert: (w) => w.join("_").toUpperCase() },
  { label: "kebab-case", convert: (w) => w.join("-") },
  { label: "dot.case", convert: (w) => w.join(".") },
  { label: "Title Case", convert: (w) => w.map(cap).join(" ") },
  { label: "Sentence case", convert: (w) => (w.length ? cap(w.join(" ")) : "") },
  { label: "lower case", convert: (w) => w.join(" ") },
  { label: "UPPER CASE", convert: (w) => w.join(" ").toUpperCase() }
]

export function CaseTool(): HTMLElement {
  const input = textarea("some example text", 3)
  const list = el("div", "case-list")
  const emptyNote = note("Type something to see it in every casing.")

  function render() {
    const words = splitWords(input.value)
    list.replaceChildren()

    if (words.length === 0) {
      emptyNote.style.display = ""
      return
    }
    emptyNote.style.display = "none"

    for (const { label, convert } of CASES) {
      const value = convert(words)
      const line = el("div", "case-row")
      const name = el("span", "case-label", label)
      const out = el("code", "case-value", value)
      line.append(name, out, copyButton(() => value, "Copy"))
      list.append(line)
    }
  }

  live([input], render)
  render()

  return wrapper(field("Input", input), emptyNote, list)
}

function cap(word: string): string {
  return word ? word[0].toUpperCase() + word.slice(1) : word
}

/**
 * Splits on separators and camelCase/acronym boundaries so any input casing
 * round-trips: "XMLHttpRequest" -> ["xml", "http", "request"].
 */
export function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase())
}
