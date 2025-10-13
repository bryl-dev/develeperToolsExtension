import { ColorTool } from "../tools/ColorTool"
import { JsonTool } from "../tools/JsonTool"

const select = document.getElementById("toolSelect") as HTMLSelectElement
const container = document.getElementById("toolContainer")!

select.addEventListener("change", () => {
  container.innerHTML = ""
  switch (select.value) {
    case "color":
      container.appendChild(ColorTool())
      break
    case "json":
      container.appendChild(JsonTool())
      break
  }
})
