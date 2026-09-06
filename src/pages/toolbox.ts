import { ToolDef, getTool, groupedTools, toolsForSurface } from "../tools/registry"

const sidebar = document.getElementById("toolList")!
const content = document.getElementById("toolContent")!
const heading = document.getElementById("toolHeading")!
const search = document.getElementById("toolSearch") as HTMLInputElement

const tools = toolsForSurface("page")
let activeId: string | null = null

buildSidebar()
route()

window.addEventListener("hashchange", route)
search.addEventListener("input", buildSidebar)

function buildSidebar() {
  const query = search.value.trim().toLowerCase()
  const matches = query
    ? tools.filter((t) => t.label.toLowerCase().includes(query) || t.id.includes(query))
    : tools

  sidebar.replaceChildren()

  if (matches.length === 0) {
    const empty = document.createElement("p")
    empty.className = "note"
    empty.textContent = "No tools match that search."
    sidebar.append(empty)
    return
  }

  for (const { group, tools: groupTools } of groupedTools(matches)) {
    const title = document.createElement("h4")
    title.className = "sidebar-group"
    title.textContent = group
    sidebar.append(title)

    for (const tool of groupTools) {
      const link = document.createElement("a")
      link.className = tool.id === activeId ? "sidebar-link active" : "sidebar-link"
      link.href = `#${tool.id}`
      link.textContent = tool.label
      link.dataset.toolId = tool.id
      sidebar.append(link)
    }
  }
}

function route() {
  const id = location.hash.replace(/^#/, "")
  const tool = getTool(id)

  if (!tool || (tool.surface !== "page" && tool.surface !== "both")) {
    showWelcome()
    return
  }
  void show(tool)
}

async function show(tool: ToolDef) {
  activeId = tool.id
  heading.textContent = tool.label
  document.title = `${tool.label} — Dev Toolbox`

  const loading = document.createElement("p")
  loading.className = "note"
  loading.textContent = "Loading…"
  content.replaceChildren(loading)
  buildSidebar()

  try {
    const node = await tool.mount()
    // A second navigation may have landed while this tool was loading.
    if (activeId !== tool.id) return
    content.replaceChildren(node)
  } catch (e) {
    if (activeId !== tool.id) return
    const error = document.createElement("p")
    error.className = "error"
    error.textContent = `Could not load this tool: ${e instanceof Error ? e.message : String(e)}`
    content.replaceChildren(error)
  }
}

function showWelcome() {
  activeId = null
  heading.textContent = "Dev Toolbox"
  document.title = "Dev Toolbox"

  content.replaceChildren()

  const intro = document.createElement("p")
  intro.className = "note"
  intro.textContent = "Pick a tool from the left. Everything runs locally in your browser."
  content.append(intro)

  const grid = document.createElement("div")
  grid.className = "tool-grid"

  for (const tool of tools) {
    const card = document.createElement("a")
    card.className = "tool-card"
    card.href = `#${tool.id}`
    card.append(Object.assign(document.createElement("strong"), { textContent: tool.label }))
    card.append(Object.assign(document.createElement("span"), { textContent: tool.group }))
    grid.append(card)
  }
  content.append(grid)
  buildSidebar()
}
