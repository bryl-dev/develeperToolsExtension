import { base64ToBytes } from "./Base64Tool"
import { copyButton, errorText, field, live, note, output, row, setError, textarea, wrapper } from "../ui/kit"

const CLAIM_LABELS: Record<string, string> = {
  exp: "Expires",
  iat: "Issued at",
  nbf: "Not before",
  auth_time: "Authenticated at"
}

export function JwtTool(): HTMLElement {
  const input = textarea("Paste a JWT (header.payload.signature)…", 4)

  const error = errorText()
  setError(error, null)

  const status = note("")
  status.style.display = "none"

  const headerOut = output()
  const payloadOut = output()
  const claimsOut = note("")
  claimsOut.className = "note claims"

  const signatureNote = note("Signature is not verified — this tool only decodes.")

  function decode() {
    const token = input.value.trim()
    headerOut.textContent = ""
    payloadOut.textContent = ""
    claimsOut.textContent = ""
    status.style.display = "none"

    if (!token) {
      setError(error, null)
      return
    }

    const parts = token.split(".")
    if (parts.length < 2) {
      setError(error, "A JWT needs at least two dot-separated segments.")
      return
    }

    try {
      const header = decodeSegment(parts[0])
      const payload = decodeSegment(parts[1])
      headerOut.textContent = JSON.stringify(header, null, 2)
      payloadOut.textContent = JSON.stringify(payload, null, 2)
      setError(error, null)
      renderClaims(payload)
    } catch {
      setError(error, "Could not decode — segments are not valid Base64URL JSON.")
    }
  }

  function renderClaims(payload: unknown) {
    if (typeof payload !== "object" || payload === null) return
    const claims = payload as Record<string, unknown>

    const lines: string[] = []
    for (const [key, label] of Object.entries(CLAIM_LABELS)) {
      const value = claims[key]
      if (typeof value !== "number") continue
      lines.push(`${label}: ${new Date(value * 1000).toLocaleString()}`)
    }
    claimsOut.textContent = lines.join("\n")

    if (typeof claims.exp === "number") {
      const expiresAt = claims.exp * 1000
      const expired = expiresAt < Date.now()
      status.textContent = expired
        ? `Expired ${relative(expiresAt)}`
        : `Valid — expires ${relative(expiresAt)}`
      status.className = expired ? "note badge badge-bad" : "note badge badge-good"
      status.style.display = ""
    }
  }

  live([input], decode)

  return wrapper(
    field("Token", input),
    row(copyButton(() => payloadOut.textContent ?? "", "Copy payload")),
    error,
    status,
    field("Header", headerOut),
    field("Payload", payloadOut),
    claimsOut,
    signatureNote
  )
}

function decodeSegment(segment: string): unknown {
  const json = new TextDecoder("utf-8").decode(base64ToBytes(segment))
  return JSON.parse(json)
}

export function relative(timestampMs: number): string {
  const deltaSeconds = Math.round((timestampMs - Date.now()) / 1000)
  const absolute = Math.abs(deltaSeconds)
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

  if (absolute < 60) return formatter.format(deltaSeconds, "second")
  if (absolute < 3600) return formatter.format(Math.round(deltaSeconds / 60), "minute")
  if (absolute < 86400) return formatter.format(Math.round(deltaSeconds / 3600), "hour")
  if (absolute < 2592000) return formatter.format(Math.round(deltaSeconds / 86400), "day")
  if (absolute < 31536000) return formatter.format(Math.round(deltaSeconds / 2592000), "month")
  return formatter.format(Math.round(deltaSeconds / 31536000), "year")
}
