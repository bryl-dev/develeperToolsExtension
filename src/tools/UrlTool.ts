import {
  button,
  copyButton,
  el,
  errorText,
  field,
  note,
  row,
  setError,
  textarea,
  wrapper
} from "../ui/kit"

export function UrlTool(): HTMLElement {
  const input = textarea("A URL, or text to encode…", 4)
  const result = textarea("", 4)
  result.readOnly = true

  const error = errorText()
  setError(error, null)

  const paramsWrap = el("div", "params")
  const paramsNote = note("Parse a URL to edit its query parameters here.")

  const encodeBtn = button("Encode", () => {
    result.value = encodeURIComponent(input.value)
    setError(error, null)
  })

  const decodeBtn = button("Decode", () => {
    try {
      result.value = decodeURIComponent(input.value)
      setError(error, null)
    } catch {
      result.value = ""
      setError(error, "Input contains an invalid percent-escape sequence.")
    }
  })

  const parseBtn = button("Parse query", () => parse(), "primary")

  let currentUrl: URL | null = null
  let bareQuery: URLSearchParams | null = null

  function parse() {
    const raw = input.value.trim()
    currentUrl = null
    bareQuery = null
    paramsWrap.replaceChildren()

    if (!raw) {
      setError(error, null)
      paramsNote.textContent = "Parse a URL to edit its query parameters here."
      return
    }

    try {
      currentUrl = new URL(raw)
    } catch {
      // Not a full URL — treat the input as a bare query string.
      bareQuery = new URLSearchParams(raw.replace(/^[?&]/, ""))
    }

    const params = currentUrl ? currentUrl.searchParams : bareQuery!
    const entries = [...params.entries()]

    if (entries.length === 0) {
      paramsNote.textContent = "No query parameters found."
      setError(error, null)
      rebuild()
      return
    }

    paramsNote.textContent = `${entries.length} parameter${entries.length === 1 ? "" : "s"}:`
    for (const [key, value] of entries) {
      paramsWrap.append(paramRow(key, value))
    }
    setError(error, null)
    rebuild()
  }

  function paramRow(key: string, value: string): HTMLElement {
    const keyInput = el("input", "input param-key")
    keyInput.type = "text"
    keyInput.value = key

    const valueInput = el("input", "input param-value")
    valueInput.type = "text"
    valueInput.value = value

    const remove = button("x", () => {
      line.remove()
      rebuild()
    })
    remove.title = "Remove parameter"
    remove.className = "btn btn-icon"

    keyInput.addEventListener("input", rebuild)
    valueInput.addEventListener("input", rebuild)

    const line = el("div", "param-row")
    line.append(keyInput, valueInput, remove)
    return line
  }

  /** Rewrites the result box from the current parameter rows. */
  function rebuild() {
    const params = new URLSearchParams()
    for (const line of paramsWrap.querySelectorAll<HTMLElement>(".param-row")) {
      const key = line.querySelector<HTMLInputElement>(".param-key")!.value
      const value = line.querySelector<HTMLInputElement>(".param-value")!.value
      if (key) params.append(key, value)
    }

    if (currentUrl) {
      const rebuilt = new URL(currentUrl.toString())
      rebuilt.search = params.toString()
      result.value = rebuilt.toString()
    } else {
      result.value = params.toString()
    }
  }

  const addBtn = button("Add parameter", () => {
    paramsWrap.append(paramRow("", ""))
    rebuild()
  })

  return wrapper(
    field("Input", input),
    row(encodeBtn, decodeBtn, parseBtn, copyButton(() => result.value, "Copy result")),
    error,
    field("Result", result),
    paramsNote,
    paramsWrap,
    row(addBtn)
  )
}
