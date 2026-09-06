import { GROUP_ORDER, TOOLS, ToolDef, getTool, pageUrl } from "../tools/registry"

const select = document.getElementById("toolSelect") as HTMLSelectElement
const container = document.getElementById("toolContainer")!
const openPageLink = document.getElementById("openPage") as HTMLAnchorElement

const LAST_TOOL_KEY = "devToolbox.lastTool"

buildOptions()
restoreLastTool()

select.addEventListener("change", () => {
  const tool = getTool(select.value)
  if (!tool) {
    container.replaceChildren()
    return
  }
  void activate(tool)
})

openPageLink.addEventListener("click", (event) => {
  event.preventDefault()
  openInTab(select.value || undefined)
})

/** Populates the dropdown with an <optgroup> per registry group. */
function buildOptions() {
  const placeholder = document.createElement("option")
  placeholder.value = ""
  placeholder.textContent = "-- Select a tool --"
  select.append(placeholder)

  for (const group of GROUP_ORDER) {
    const tools = TOOLS.filter((t) => t.group === group)
    if (tools.length === 0) continue

    const optgroup = document.createElement("optgroup")
    optgroup.label = group

    for (const tool of tools) {
      const option = document.createElement("option")
      option.value = tool.id
      // Page-only tools hand off to a tab, so flag that in the label.
      option.textContent = tool.surface === "page" ? `${tool.label} (opens tab)` : tool.label
      optgroup.append(option)
    }
    select.append(optgroup)
  }
}

async function activate(tool: ToolDef) {
  if (tool.surface === "page") {
    openInTab(tool.id)
    return
  }

  container.replaceChildren()
  try {
    container.append(await tool.mount())
    rememberTool(tool.id)
  } catch (e) {
    const error = document.createElement("p")
    error.className = "error"
    error.textContent = `Could not load ${tool.label}: ${e instanceof Error ? e.message : String(e)}`
    container.append(error)
  }
}

function openInTab(toolId?: string) {
  chrome.tabs.create({ url: pageUrl(toolId) })
  window.close()
}

function rememberTool(id: string) {
  try {
    localStorage.setItem(LAST_TOOL_KEY, id)
  } catch {
    // Storage can be unavailable; remembering the last tool is best-effort.
  }
}

function restoreLastTool() {
  let last: string | null = null
  try {
    last = localStorage.getItem(LAST_TOOL_KEY)
  } catch {
    return
  }

  const tool = last ? getTool(last) : undefined
  // Never auto-reopen a tab on popup open.
  if (!tool || tool.surface === "page") return

  select.value = tool.id
  void activate(tool)
}
