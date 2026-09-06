import {
  getTool,
  groupedTools,
  toolsForSurface
} from "../chunks/chunk-5R2GIOIL.js";
import "../chunks/chunk-A2N3EO2G.js";

// src/pages/toolbox.ts
var sidebar = document.getElementById("toolList");
var content = document.getElementById("toolContent");
var heading = document.getElementById("toolHeading");
var search = document.getElementById("toolSearch");
var tools = toolsForSurface("page");
var activeId = null;
buildSidebar();
route();
window.addEventListener("hashchange", route);
search.addEventListener("input", buildSidebar);
function buildSidebar() {
  const query = search.value.trim().toLowerCase();
  const matches = query ? tools.filter((t) => t.label.toLowerCase().includes(query) || t.id.includes(query)) : tools;
  sidebar.replaceChildren();
  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "note";
    empty.textContent = "No tools match that search.";
    sidebar.append(empty);
    return;
  }
  for (const { group, tools: groupTools } of groupedTools(matches)) {
    const title = document.createElement("h4");
    title.className = "sidebar-group";
    title.textContent = group;
    sidebar.append(title);
    for (const tool of groupTools) {
      const link = document.createElement("a");
      link.className = tool.id === activeId ? "sidebar-link active" : "sidebar-link";
      link.href = `#${tool.id}`;
      link.textContent = tool.label;
      link.dataset.toolId = tool.id;
      sidebar.append(link);
    }
  }
}
function route() {
  const id = location.hash.replace(/^#/, "");
  const tool = getTool(id);
  if (!tool || tool.surface !== "page" && tool.surface !== "both") {
    showWelcome();
    return;
  }
  void show(tool);
}
async function show(tool) {
  activeId = tool.id;
  heading.textContent = tool.label;
  document.title = `${tool.label} \u2014 Dev Toolbox`;
  const loading = document.createElement("p");
  loading.className = "note";
  loading.textContent = "Loading\u2026";
  content.replaceChildren(loading);
  buildSidebar();
  try {
    const node = await tool.mount();
    if (activeId !== tool.id) return;
    content.replaceChildren(node);
  } catch (e) {
    if (activeId !== tool.id) return;
    const error = document.createElement("p");
    error.className = "error";
    error.textContent = `Could not load this tool: ${e instanceof Error ? e.message : String(e)}`;
    content.replaceChildren(error);
  }
}
function showWelcome() {
  activeId = null;
  heading.textContent = "Dev Toolbox";
  document.title = "Dev Toolbox";
  content.replaceChildren();
  const intro = document.createElement("p");
  intro.className = "note";
  intro.textContent = "Pick a tool from the left. Everything runs locally in your browser.";
  content.append(intro);
  const grid = document.createElement("div");
  grid.className = "tool-grid";
  for (const tool of tools) {
    const card = document.createElement("a");
    card.className = "tool-card";
    card.href = `#${tool.id}`;
    card.append(Object.assign(document.createElement("strong"), { textContent: tool.label }));
    card.append(Object.assign(document.createElement("span"), { textContent: tool.group }));
    grid.append(card);
  }
  content.append(grid);
  buildSidebar();
}
//# sourceMappingURL=toolbox.js.map
