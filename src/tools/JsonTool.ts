export function JsonTool(): HTMLElement {
  const wrapper = document.createElement("div")

  const textarea = document.createElement("textarea")
  textarea.rows = 5
  textarea.style.width = "100%"

  const button = document.createElement("button")
  button.textContent = "Format JSON"

  const output = document.createElement("pre")

  button.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(textarea.value)
      output.textContent = JSON.stringify(parsed, null, 2)
    } catch {
      output.textContent = "Invalid JSON"
    }
  })

  wrapper.append(textarea, button, output)
  return wrapper
}
