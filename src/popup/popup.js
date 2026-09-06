import {
  GROUP_ORDER,
  TOOLS,
  getTool,
  pageUrl
} from "../chunks/chunk-5R2GIOIL.js";
import "../chunks/chunk-A2N3EO2G.js";

// src/popup/popup.ts
var select = document.getElementById("toolSelect");
var container = document.getElementById("toolContainer");
var openPageLink = document.getElementById("openPage");
var LAST_TOOL_KEY = "devToolbox.lastTool";
buildOptions();
restoreLastTool();
select.addEventListener("change", () => {
  const tool = getTool(select.value);
  if (!tool) {
    container.replaceChildren();
    return;
  }
  void activate(tool);
});
openPageLink.addEventListener("click", (event) => {
  event.preventDefault();
  openInTab(select.value || void 0);
});
function buildOptions() {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Select a tool --";
  select.append(placeholder);
  for (const group of GROUP_ORDER) {
    const tools = TOOLS.filter((t) => t.group === group);
    if (tools.length === 0) continue;
    const optgroup = document.createElement("optgroup");
    optgroup.label = group;
    for (const tool of tools) {
      const option = document.createElement("option");
      option.value = tool.id;
      option.textContent = tool.surface === "page" ? `${tool.label} (opens tab)` : tool.label;
      optgroup.append(option);
    }
    select.append(optgroup);
  }
}
async function activate(tool) {
  if (tool.surface === "page") {
    openInTab(tool.id);
    return;
  }
  container.replaceChildren();
  try {
    container.append(await tool.mount());
    rememberTool(tool.id);
  } catch (e) {
    const error = document.createElement("p");
    error.className = "error";
    error.textContent = `Could not load ${tool.label}: ${e instanceof Error ? e.message : String(e)}`;
    container.append(error);
  }
}
function openInTab(toolId) {
  chrome.tabs.create({ url: pageUrl(toolId) });
  window.close();
}
function rememberTool(id) {
  try {
    localStorage.setItem(LAST_TOOL_KEY, id);
  } catch {
  }
}
function restoreLastTool() {
  let last = null;
  try {
    last = localStorage.getItem(LAST_TOOL_KEY);
  } catch {
    return;
  }
  const tool = last ? getTool(last) : void 0;
  if (!tool || tool.surface === "page") return;
  select.value = tool.id;
  void activate(tool);
}
//# sourceMappingURL=popup.js.map
