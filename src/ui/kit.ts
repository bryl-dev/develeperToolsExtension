// Small DOM helpers shared by every tool, so each one doesn't rebuild the same
// createElement boilerplate.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export function wrapper(...children: (Node | null | undefined)[]): HTMLDivElement {
  const div = el("div", "tool")
  div.append(...children.filter((c): c is Node => !!c))
  return div
}

export function row(...children: (Node | null | undefined)[]): HTMLDivElement {
  const div = el("div", "row")
  div.append(...children.filter((c): c is Node => !!c))
  return div
}

export function field(labelText: string, control: HTMLElement): HTMLDivElement {
  const div = el("div", "field")
  const label = el("label", "field-label", labelText)
  const id = `f${Math.random().toString(36).slice(2, 9)}`
  control.id = id
  label.htmlFor = id
  div.append(label, control)
  return div
}

export function textarea(placeholder = "", rows = 5): HTMLTextAreaElement {
  const ta = el("textarea", "input")
  ta.rows = rows
  ta.placeholder = placeholder
  ta.spellcheck = false
  return ta
}

export function textInput(placeholder = "", value = ""): HTMLInputElement {
  const input = el("input", "input")
  input.type = "text"
  input.placeholder = placeholder
  input.value = value
  input.spellcheck = false
  return input
}

export function select(options: { value: string; label: string }[]): HTMLSelectElement {
  const sel = el("select", "input")
  for (const opt of options) {
    const o = el("option")
    o.value = opt.value
    o.textContent = opt.label
    sel.append(o)
  }
  return sel
}

export function button(
  text: string,
  onClick: () => void,
  variant: "primary" | "default" = "default"
): HTMLButtonElement {
  const btn = el("button", variant === "primary" ? "btn btn-primary" : "btn", text)
  btn.type = "button"
  btn.addEventListener("click", onClick)
  return btn
}

/**
 * A button that copies the value returned by `getText()` and briefly confirms.
 * Returns to its original label after a short delay.
 */
export function copyButton(getText: () => string, label = "Copy"): HTMLButtonElement {
  let timer: number | undefined
  const btn = button(label, async () => {
    const text = getText()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      btn.textContent = "Copied!"
      btn.classList.add("copied")
    } catch {
      btn.textContent = "Copy failed"
    }
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      btn.textContent = label
      btn.classList.remove("copied")
    }, 1200)
  })
  return btn
}

export function output(): HTMLPreElement {
  return el("pre", "output")
}

export function note(text = ""): HTMLParagraphElement {
  return el("p", "note", text)
}

export function errorText(text = ""): HTMLParagraphElement {
  return el("p", "error", text)
}

export function setError(node: HTMLElement, message: string | null): void {
  node.textContent = message ?? ""
  node.style.display = message ? "" : "none"
}

/** Re-runs `fn` on input, swallowing errors into an error node. */
export function live(
  inputs: HTMLElement[],
  fn: () => void,
  events: string[] = ["input", "change"]
): void {
  for (const input of inputs) {
    for (const event of events) input.addEventListener(event, fn)
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = el("a")
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  // Give Chrome a moment to start the download before invalidating the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
