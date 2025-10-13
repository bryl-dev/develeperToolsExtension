export function ColorTool(): HTMLElement {
  const wrapper = document.createElement("div")
  wrapper.className = "tool color-tool"

  const input = document.createElement("input")
  input.type = "color"
  input.className = "color-input"

  const pickButton = document.createElement("button")
  pickButton.textContent = "Pick from page"
  pickButton.className = "action-btn"

  const copyHexButton = document.createElement("button")
  copyHexButton.textContent = "Copy HEX"
  copyHexButton.className = "copy-btn"

  const copyRgbButton = document.createElement("button")
  copyRgbButton.textContent = "Copy RGB"
  copyRgbButton.className = "copy-btn"

  const output = document.createElement("p")
  output.textContent = "Pick a color…"
  output.className = "color-output"

  // Make a clean row for buttons
  const buttonRow = document.createElement("div")
  buttonRow.className = "button-row"
  buttonRow.append(pickButton, copyHexButton, copyRgbButton)

  input.addEventListener("input", () => showColor(input.value))

  pickButton.addEventListener("click", async () => {
    const hex = await pickColorFromPage()
    if (hex) {
      input.value = hex
      showColor(hex)
    }
  })

  copyHexButton.addEventListener("click", () => {
    if (input.value) copyToClipboard(input.value, copyHexButton, "HEX")
  })

  copyRgbButton.addEventListener("click", () => {
    const rgb = hexToRgb(input.value)
    copyToClipboard(rgb, copyRgbButton, "RGB")
  })

  function showColor(hex: string) {
    const rgb = hexToRgb(hex)
    output.textContent = `HEX: ${hex}, RGB: ${rgb}`
    output.style.borderLeft = `8px solid ${hex}`
  }

  function copyToClipboard(text: string, btn: HTMLButtonElement, label: string) {
    navigator.clipboard.writeText(text)
    btn.textContent = "Copied!"
    setTimeout(() => (btn.textContent = `Copy ${label}`), 1200)
  }

  wrapper.append(input, buttonRow, output)
  return wrapper
}

// Utility
async function pickColorFromPage(): Promise<string | null> {
  if ("EyeDropper" in window) {
    const eyeDropper = new (window as any).EyeDropper()
    try {
      const result = await eyeDropper.open()
      return result.sRGBHex
    } catch {
      return null
    }
  }
  return null
}

function hexToRgb(hex: string): string {
  const bigint = parseInt(hex.slice(1), 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgb(${r}, ${g}, ${b})`
}
