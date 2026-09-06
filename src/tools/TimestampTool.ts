import { relative } from "./JwtTool"
import {
  button,
  copyButton,
  el,
  errorText,
  field,
  note,
  row,
  setError,
  textInput,
  wrapper
} from "../ui/kit"

export function TimestampTool(): HTMLElement {
  const nowLine = note("")
  const epochInput = textInput("1700000000 or 1700000000000")
  const dateInput = textInput("2026-09-03T16:10:00Z or 'now'")

  const error = errorText()
  setError(error, null)

  const table = el("div", "kv-table")

  const timer = window.setInterval(() => {
    const now = Date.now()
    nowLine.textContent = `Now: ${Math.floor(now / 1000)} s · ${now} ms · ${new Date(now).toLocaleString()}`
  }, 1000)
  // The popup tears its document down on close; the page surface swaps innerHTML.
  window.addEventListener("unload", () => window.clearInterval(timer))

  function show(date: Date) {
    if (Number.isNaN(date.getTime())) {
      setError(error, "That is not a date this tool can read.")
      table.replaceChildren()
      return
    }
    setError(error, null)

    const ms = date.getTime()
    const rows: [string, string][] = [
      ["Epoch (seconds)", String(Math.floor(ms / 1000))],
      ["Epoch (milliseconds)", String(ms)],
      ["ISO 8601 (UTC)", date.toISOString()],
      ["Local time", date.toLocaleString()],
      ["UTC string", date.toUTCString()],
      ["Relative", relative(ms)],
      ["Time zone", Intl.DateTimeFormat().resolvedOptions().timeZone]
    ]

    table.replaceChildren()
    for (const [label, value] of rows) {
      const line = el("div", "kv-row")
      line.append(el("span", "kv-key", label), el("code", "kv-value", value))
      line.append(copyButton(() => value, "Copy"))
      table.append(line)
    }
  }

  epochInput.addEventListener("input", () => {
    const raw = epochInput.value.trim()
    if (!raw) {
      setError(error, null)
      table.replaceChildren()
      return
    }
    const n = Number(raw)
    if (!Number.isFinite(n)) {
      setError(error, "Enter a number of seconds or milliseconds.")
      return
    }
    // 10-digit values are seconds; 13-digit values are already milliseconds.
    show(new Date(Math.abs(n) < 1e11 ? n * 1000 : n))
  })

  dateInput.addEventListener("input", () => {
    const raw = dateInput.value.trim()
    if (!raw) {
      setError(error, null)
      table.replaceChildren()
      return
    }
    show(raw.toLowerCase() === "now" ? new Date() : new Date(raw))
  })

  const nowBtn = button(
    "Use current time",
    () => {
      const now = new Date()
      epochInput.value = String(Math.floor(now.getTime() / 1000))
      dateInput.value = now.toISOString()
      show(now)
    },
    "primary"
  )

  show(new Date())

  return wrapper(
    nowLine,
    field("From epoch", epochInput),
    field("From date string", dateInput),
    row(nowBtn),
    error,
    table
  )
}
