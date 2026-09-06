import {
  el,
  errorText,
  field,
  live,
  note,
  row,
  setError,
  textInput,
  textarea,
  wrapper
} from "../ui/kit"

/** Stops a pathological pattern from locking the popup up indefinitely. */
const MATCH_LIMIT = 500

export function RegexTool(): HTMLElement {
  const pattern = textInput("\\b\\w+@\\w+\\.\\w+\\b")
  const flagsInput = textInput("gi", "g")
  flagsInput.className = "input flags-input"

  const subject = textarea("Text to test against…", 6)

  const error = errorText()
  setError(error, null)

  const summary = note("")
  const preview = el("div", "match-preview")
  const groups = el("div", "match-groups")

  function run() {
    preview.replaceChildren()
    groups.replaceChildren()
    summary.textContent = ""

    if (!pattern.value) {
      setError(error, null)
      return
    }

    let regex: RegExp
    try {
      // Always force `g` so we can enumerate every match, then honor the rest.
      const flags = new Set(flagsInput.value.replace(/[^dgimsuvy]/g, "").split(""))
      flags.add("g")
      regex = new RegExp(pattern.value, [...flags].join(""))
    } catch (e) {
      setError(error, e instanceof Error ? e.message : "Invalid regular expression.")
      return
    }
    setError(error, null)

    const text = subject.value
    const matches: RegExpExecArray[] = []
    let match: RegExpExecArray | null
    let guard = 0

    while ((match = regex.exec(text)) !== null) {
      matches.push(match)
      // A zero-length match would otherwise spin forever at the same index.
      if (match[0] === "") regex.lastIndex++
      if (++guard >= MATCH_LIMIT) break
    }

    if (matches.length === 0) {
      summary.textContent = text ? "No matches." : "Enter some text to test."
      return
    }

    summary.textContent =
      guard >= MATCH_LIMIT
        ? `Showing the first ${MATCH_LIMIT} matches.`
        : `${matches.length} match${matches.length === 1 ? "" : "es"}.`

    renderHighlights(text, matches)
    renderGroups(matches)
  }

  function renderHighlights(text: string, matches: RegExpExecArray[]) {
    let cursor = 0
    for (const m of matches) {
      if (m.index > cursor) preview.append(document.createTextNode(text.slice(cursor, m.index)))
      preview.append(el("mark", "match", m[0]))
      cursor = m.index + m[0].length
    }
    if (cursor < text.length) preview.append(document.createTextNode(text.slice(cursor)))
  }

  function renderGroups(matches: RegExpExecArray[]) {
    const hasGroups = matches.some((m) => m.length > 1 || m.groups)
    if (!hasGroups) return

    matches.slice(0, 20).forEach((m, i) => {
      const block = el("div", "group-block")
      block.append(el("strong", "", `Match ${i + 1}: ${m[0]}`))

      for (let g = 1; g < m.length; g++) {
        block.append(el("div", "group-row", `  $${g} = ${m[g] ?? "(no match)"}`))
      }
      for (const [name, value] of Object.entries(m.groups ?? {})) {
        block.append(el("div", "group-row", `  ${name} = ${value ?? "(no match)"}`))
      }
      groups.append(block)
    })
  }

  live([pattern, flagsInput, subject], run)

  return wrapper(
    row(field("Pattern", pattern), field("Flags", flagsInput)),
    error,
    field("Test string", subject),
    summary,
    preview,
    groups
  )
}
