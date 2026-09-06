var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/ui/kit.ts
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== void 0) node.textContent = text;
  return node;
}
function wrapper(...children) {
  const div = el("div", "tool");
  div.append(...children.filter((c) => !!c));
  return div;
}
function row(...children) {
  const div = el("div", "row");
  div.append(...children.filter((c) => !!c));
  return div;
}
function field(labelText, control) {
  const div = el("div", "field");
  const label = el("label", "field-label", labelText);
  const id = `f${Math.random().toString(36).slice(2, 9)}`;
  control.id = id;
  label.htmlFor = id;
  div.append(label, control);
  return div;
}
function textarea(placeholder = "", rows = 5) {
  const ta = el("textarea", "input");
  ta.rows = rows;
  ta.placeholder = placeholder;
  ta.spellcheck = false;
  return ta;
}
function textInput(placeholder = "", value = "") {
  const input = el("input", "input");
  input.type = "text";
  input.placeholder = placeholder;
  input.value = value;
  input.spellcheck = false;
  return input;
}
function select(options) {
  const sel = el("select", "input");
  for (const opt of options) {
    const o = el("option");
    o.value = opt.value;
    o.textContent = opt.label;
    sel.append(o);
  }
  return sel;
}
function button(text, onClick, variant = "default") {
  const btn = el("button", variant === "primary" ? "btn btn-primary" : "btn", text);
  btn.type = "button";
  btn.addEventListener("click", onClick);
  return btn;
}
function copyButton(getText, label = "Copy") {
  let timer;
  const btn = button(label, async () => {
    const text = getText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied!";
      btn.classList.add("copied");
    } catch {
      btn.textContent = "Copy failed";
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      btn.textContent = label;
      btn.classList.remove("copied");
    }, 1200);
  });
  return btn;
}
function output() {
  return el("pre", "output");
}
function note(text = "") {
  return el("p", "note", text);
}
function errorText(text = "") {
  return el("p", "error", text);
}
function setError(node, message) {
  node.textContent = message ?? "";
  node.style.display = message ? "" : "none";
}
function live(inputs, fn, events = ["input", "change"]) {
  for (const input of inputs) {
    for (const event of events) input.addEventListener(event, fn);
  }
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = el("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1e4);
}

export {
  __commonJS,
  __toESM,
  el,
  wrapper,
  row,
  field,
  textarea,
  textInput,
  select,
  button,
  copyButton,
  output,
  note,
  errorText,
  setError,
  live,
  formatBytes,
  downloadBlob
};
//# sourceMappingURL=chunk-A2N3EO2G.js.map
