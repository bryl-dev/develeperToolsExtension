import {
  button,
  copyButton,
  el,
  errorText,
  field,
  formatBytes,
  live,
  note,
  output,
  row,
  select,
  setError,
  textInput,
  textarea,
  wrapper
} from "./chunk-A2N3EO2G.js";

// src/tools/ColorTool.ts
function ColorTool() {
  const wrapper2 = document.createElement("div");
  wrapper2.className = "tool color-tool";
  const input = document.createElement("input");
  input.type = "color";
  input.className = "color-input";
  const pickButton = document.createElement("button");
  pickButton.textContent = "Pick from page";
  pickButton.className = "action-btn";
  const copyHexButton = document.createElement("button");
  copyHexButton.textContent = "Copy HEX";
  copyHexButton.className = "copy-btn";
  const copyRgbButton = document.createElement("button");
  copyRgbButton.textContent = "Copy RGB";
  copyRgbButton.className = "copy-btn";
  const output2 = document.createElement("p");
  output2.textContent = "Pick a color\u2026";
  output2.className = "color-output";
  const buttonRow = document.createElement("div");
  buttonRow.className = "button-row";
  buttonRow.append(pickButton, copyHexButton, copyRgbButton);
  input.addEventListener("input", () => showColor(input.value));
  pickButton.addEventListener("click", async () => {
    const hex = await pickColorFromPage();
    if (hex) {
      input.value = hex;
      showColor(hex);
    }
  });
  copyHexButton.addEventListener("click", () => {
    if (input.value) copyToClipboard(input.value, copyHexButton, "HEX");
  });
  copyRgbButton.addEventListener("click", () => {
    const rgb = hexToRgb(input.value);
    copyToClipboard(rgb, copyRgbButton, "RGB");
  });
  function showColor(hex) {
    const rgb = hexToRgb(hex);
    output2.textContent = `HEX: ${hex}, RGB: ${rgb}`;
    output2.style.borderLeft = `8px solid ${hex}`;
  }
  function copyToClipboard(text, btn, label) {
    navigator.clipboard.writeText(text);
    btn.textContent = "Copied!";
    setTimeout(() => btn.textContent = `Copy ${label}`, 1200);
  }
  wrapper2.append(input, buttonRow, output2);
  return wrapper2;
}
async function pickColorFromPage() {
  if ("EyeDropper" in window) {
    const eyeDropper = new window.EyeDropper();
    try {
      const result = await eyeDropper.open();
      return result.sRGBHex;
    } catch {
      return null;
    }
  }
  return null;
}
function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = bigint >> 16 & 255;
  const g = bigint >> 8 & 255;
  const b = bigint & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

// src/tools/JsonTool.ts
function JsonTool() {
  const input = textarea('{"hello":"world"}', 5);
  const result = output();
  const indent = textInput("2", "2");
  indent.type = "number";
  indent.min = "0";
  indent.max = "8";
  indent.className = "input indent-input";
  const error = errorText();
  setError(error, null);
  const stats = note("");
  stats.style.display = "none";
  function parse() {
    try {
      const value = JSON.parse(input.value);
      setError(error, null);
      return { ok: true, value };
    } catch (e) {
      result.textContent = "";
      stats.style.display = "none";
      setError(error, describeJsonError(e, input.value));
      return { ok: false };
    }
  }
  function render(text, value) {
    result.textContent = text;
    stats.textContent = `${text.length} characters \xB7 ${describeShape(value)}`;
    stats.style.display = "";
  }
  function indentWidth() {
    return Math.min(Math.max(parseInt(indent.value, 10) || 0, 0), 8);
  }
  const formatBtn = button(
    "Format",
    () => {
      const parsed = parse();
      if (!parsed.ok) return;
      render(JSON.stringify(parsed.value, null, indentWidth()), parsed.value);
    },
    "primary"
  );
  const minifyBtn = button("Minify", () => {
    const parsed = parse();
    if (!parsed.ok) return;
    render(JSON.stringify(parsed.value), parsed.value);
  });
  const sortBtn = button("Format + sort keys", () => {
    const parsed = parse();
    if (!parsed.ok) return;
    render(JSON.stringify(sortKeys(parsed.value), null, indentWidth()), parsed.value);
  });
  return wrapper(
    field("JSON", input),
    row(formatBtn, minifyBtn, sortBtn, field("Indent", indent), copyButton(() => result.textContent ?? "", "Copy")),
    error,
    stats,
    field("Result", result)
  );
}
function describeJsonError(e, source) {
  const base = e instanceof Error ? e.message : "Invalid JSON";
  const match = /position (\d+)/.exec(base);
  if (!match) return base;
  const offset = Number(match[1]);
  const before = source.slice(0, offset);
  const line = before.split("\n").length;
  const column = offset - before.lastIndexOf("\n");
  const snippet = source.slice(Math.max(0, offset - 20), offset + 20).replace(/\n/g, "\\n");
  return `${base}
Line ${line}, column ${column} \u2014 near: \u2026${snippet}\u2026`;
}
function describeShape(value) {
  if (Array.isArray(value)) return `array of ${value.length}`;
  if (value === null) return "null";
  if (typeof value === "object") return `object with ${Object.keys(value).length} key(s)`;
  return typeof value;
}
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== "object") return value;
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeys(value[key]);
  }
  return sorted;
}

// src/tools/Base64Tool.ts
function Base64Tool() {
  const input = textarea("Text, or Base64 to decode\u2026", 5);
  const result = textarea("", 5);
  result.readOnly = true;
  const error = errorText();
  setError(error, null);
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.className = "input";
  const fileNote = note("");
  fileNote.style.display = "none";
  const encodeBtn = button(
    "Encode",
    () => {
      try {
        result.value = encodeUtf8Base64(input.value);
        setError(error, null);
      } catch (e) {
        result.value = "";
        setError(error, message(e));
      }
    },
    "primary"
  );
  const decodeBtn = button("Decode", () => {
    try {
      result.value = decodeUtf8Base64(input.value);
      setError(error, null);
    } catch {
      result.value = "";
      setError(error, "Not valid Base64.");
    }
  });
  const swapBtn = button("Use as input", () => {
    input.value = result.value;
    result.value = "";
  });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      result.value = bytesToBase64(bytes);
      fileNote.textContent = `${file.name} \u2014 ${formatBytes(file.size)} encoded as Base64.`;
      fileNote.style.display = "";
      setError(error, null);
    } catch (e) {
      setError(error, message(e));
    }
  });
  return wrapper(
    field("Input", input),
    row(encodeBtn, decodeBtn, swapBtn, copyButton(() => result.value, "Copy result")),
    error,
    field("Result", result),
    field("Or encode a file", fileInput),
    fileNote
  );
}
function message(e) {
  return e instanceof Error ? e.message : String(e);
}
function encodeUtf8Base64(text) {
  return bytesToBase64(new TextEncoder().encode(text));
}
function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
function decodeUtf8Base64(value) {
  const bytes = base64ToBytes(value);
  return new TextDecoder("utf-8").decode(bytes);
}
function base64ToBytes(value) {
  let normalized = value.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const remainder = normalized.length % 4;
  if (remainder === 2) normalized += "==";
  else if (remainder === 3) normalized += "=";
  else if (remainder === 1) throw new Error("Invalid Base64 length.");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// src/tools/JwtTool.ts
var CLAIM_LABELS = {
  exp: "Expires",
  iat: "Issued at",
  nbf: "Not before",
  auth_time: "Authenticated at"
};
function JwtTool() {
  const input = textarea("Paste a JWT (header.payload.signature)\u2026", 4);
  const error = errorText();
  setError(error, null);
  const status = note("");
  status.style.display = "none";
  const headerOut = output();
  const payloadOut = output();
  const claimsOut = note("");
  claimsOut.className = "note claims";
  const signatureNote = note("Signature is not verified \u2014 this tool only decodes.");
  function decode() {
    const token = input.value.trim();
    headerOut.textContent = "";
    payloadOut.textContent = "";
    claimsOut.textContent = "";
    status.style.display = "none";
    if (!token) {
      setError(error, null);
      return;
    }
    const parts = token.split(".");
    if (parts.length < 2) {
      setError(error, "A JWT needs at least two dot-separated segments.");
      return;
    }
    try {
      const header = decodeSegment(parts[0]);
      const payload = decodeSegment(parts[1]);
      headerOut.textContent = JSON.stringify(header, null, 2);
      payloadOut.textContent = JSON.stringify(payload, null, 2);
      setError(error, null);
      renderClaims(payload);
    } catch {
      setError(error, "Could not decode \u2014 segments are not valid Base64URL JSON.");
    }
  }
  function renderClaims(payload) {
    if (typeof payload !== "object" || payload === null) return;
    const claims = payload;
    const lines = [];
    for (const [key, label] of Object.entries(CLAIM_LABELS)) {
      const value = claims[key];
      if (typeof value !== "number") continue;
      lines.push(`${label}: ${new Date(value * 1e3).toLocaleString()}`);
    }
    claimsOut.textContent = lines.join("\n");
    if (typeof claims.exp === "number") {
      const expiresAt = claims.exp * 1e3;
      const expired = expiresAt < Date.now();
      status.textContent = expired ? `Expired ${relative(expiresAt)}` : `Valid \u2014 expires ${relative(expiresAt)}`;
      status.className = expired ? "note badge badge-bad" : "note badge badge-good";
      status.style.display = "";
    }
  }
  live([input], decode);
  return wrapper(
    field("Token", input),
    row(copyButton(() => payloadOut.textContent ?? "", "Copy payload")),
    error,
    status,
    field("Header", headerOut),
    field("Payload", payloadOut),
    claimsOut,
    signatureNote
  );
}
function decodeSegment(segment) {
  const json = new TextDecoder("utf-8").decode(base64ToBytes(segment));
  return JSON.parse(json);
}
function relative(timestampMs) {
  const deltaSeconds = Math.round((timestampMs - Date.now()) / 1e3);
  const absolute = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
  if (absolute < 60) return formatter.format(deltaSeconds, "second");
  if (absolute < 3600) return formatter.format(Math.round(deltaSeconds / 60), "minute");
  if (absolute < 86400) return formatter.format(Math.round(deltaSeconds / 3600), "hour");
  if (absolute < 2592e3) return formatter.format(Math.round(deltaSeconds / 86400), "day");
  if (absolute < 31536e3) return formatter.format(Math.round(deltaSeconds / 2592e3), "month");
  return formatter.format(Math.round(deltaSeconds / 31536e3), "year");
}

// src/tools/UrlTool.ts
function UrlTool() {
  const input = textarea("A URL, or text to encode\u2026", 4);
  const result = textarea("", 4);
  result.readOnly = true;
  const error = errorText();
  setError(error, null);
  const paramsWrap = el("div", "params");
  const paramsNote = note("Parse a URL to edit its query parameters here.");
  const encodeBtn = button("Encode", () => {
    result.value = encodeURIComponent(input.value);
    setError(error, null);
  });
  const decodeBtn = button("Decode", () => {
    try {
      result.value = decodeURIComponent(input.value);
      setError(error, null);
    } catch {
      result.value = "";
      setError(error, "Input contains an invalid percent-escape sequence.");
    }
  });
  const parseBtn = button("Parse query", () => parse(), "primary");
  let currentUrl = null;
  let bareQuery = null;
  function parse() {
    const raw = input.value.trim();
    currentUrl = null;
    bareQuery = null;
    paramsWrap.replaceChildren();
    if (!raw) {
      setError(error, null);
      paramsNote.textContent = "Parse a URL to edit its query parameters here.";
      return;
    }
    try {
      currentUrl = new URL(raw);
    } catch {
      bareQuery = new URLSearchParams(raw.replace(/^[?&]/, ""));
    }
    const params = currentUrl ? currentUrl.searchParams : bareQuery;
    const entries = [...params.entries()];
    if (entries.length === 0) {
      paramsNote.textContent = "No query parameters found.";
      setError(error, null);
      rebuild();
      return;
    }
    paramsNote.textContent = `${entries.length} parameter${entries.length === 1 ? "" : "s"}:`;
    for (const [key, value] of entries) {
      paramsWrap.append(paramRow(key, value));
    }
    setError(error, null);
    rebuild();
  }
  function paramRow(key, value) {
    const keyInput = el("input", "input param-key");
    keyInput.type = "text";
    keyInput.value = key;
    const valueInput = el("input", "input param-value");
    valueInput.type = "text";
    valueInput.value = value;
    const remove = button("x", () => {
      line.remove();
      rebuild();
    });
    remove.title = "Remove parameter";
    remove.className = "btn btn-icon";
    keyInput.addEventListener("input", rebuild);
    valueInput.addEventListener("input", rebuild);
    const line = el("div", "param-row");
    line.append(keyInput, valueInput, remove);
    return line;
  }
  function rebuild() {
    const params = new URLSearchParams();
    for (const line of paramsWrap.querySelectorAll(".param-row")) {
      const key = line.querySelector(".param-key").value;
      const value = line.querySelector(".param-value").value;
      if (key) params.append(key, value);
    }
    if (currentUrl) {
      const rebuilt = new URL(currentUrl.toString());
      rebuilt.search = params.toString();
      result.value = rebuilt.toString();
    } else {
      result.value = params.toString();
    }
  }
  const addBtn = button("Add parameter", () => {
    paramsWrap.append(paramRow("", ""));
    rebuild();
  });
  return wrapper(
    field("Input", input),
    row(encodeBtn, decodeBtn, parseBtn, copyButton(() => result.value, "Copy result")),
    error,
    field("Result", result),
    paramsNote,
    paramsWrap,
    row(addBtn)
  );
}

// src/tools/CaseTool.ts
var CASES = [
  { label: "camelCase", convert: (w) => w.map((x, i) => i === 0 ? x : cap(x)).join("") },
  { label: "PascalCase", convert: (w) => w.map(cap).join("") },
  { label: "snake_case", convert: (w) => w.join("_") },
  { label: "SCREAMING_SNAKE", convert: (w) => w.join("_").toUpperCase() },
  { label: "kebab-case", convert: (w) => w.join("-") },
  { label: "dot.case", convert: (w) => w.join(".") },
  { label: "Title Case", convert: (w) => w.map(cap).join(" ") },
  { label: "Sentence case", convert: (w) => w.length ? cap(w.join(" ")) : "" },
  { label: "lower case", convert: (w) => w.join(" ") },
  { label: "UPPER CASE", convert: (w) => w.join(" ").toUpperCase() }
];
function CaseTool() {
  const input = textarea("some example text", 3);
  const list = el("div", "case-list");
  const emptyNote = note("Type something to see it in every casing.");
  function render() {
    const words = splitWords(input.value);
    list.replaceChildren();
    if (words.length === 0) {
      emptyNote.style.display = "";
      return;
    }
    emptyNote.style.display = "none";
    for (const { label, convert } of CASES) {
      const value = convert(words);
      const line = el("div", "case-row");
      const name = el("span", "case-label", label);
      const out = el("code", "case-value", value);
      line.append(name, out, copyButton(() => value, "Copy"));
      list.append(line);
    }
  }
  live([input], render);
  render();
  return wrapper(field("Input", input), emptyNote, list);
}
function cap(word) {
  return word ? word[0].toUpperCase() + word.slice(1) : word;
}
function splitWords(input) {
  return input.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w.toLowerCase());
}

// src/tools/RegexTool.ts
var MATCH_LIMIT = 500;
function RegexTool() {
  const pattern = textInput("\\b\\w+@\\w+\\.\\w+\\b");
  const flagsInput = textInput("gi", "g");
  flagsInput.className = "input flags-input";
  const subject = textarea("Text to test against\u2026", 6);
  const error = errorText();
  setError(error, null);
  const summary = note("");
  const preview = el("div", "match-preview");
  const groups = el("div", "match-groups");
  function run() {
    preview.replaceChildren();
    groups.replaceChildren();
    summary.textContent = "";
    if (!pattern.value) {
      setError(error, null);
      return;
    }
    let regex;
    try {
      const flags = new Set(flagsInput.value.replace(/[^dgimsuvy]/g, "").split(""));
      flags.add("g");
      regex = new RegExp(pattern.value, [...flags].join(""));
    } catch (e) {
      setError(error, e instanceof Error ? e.message : "Invalid regular expression.");
      return;
    }
    setError(error, null);
    const text = subject.value;
    const matches = [];
    let match;
    let guard = 0;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match);
      if (match[0] === "") regex.lastIndex++;
      if (++guard >= MATCH_LIMIT) break;
    }
    if (matches.length === 0) {
      summary.textContent = text ? "No matches." : "Enter some text to test.";
      return;
    }
    summary.textContent = guard >= MATCH_LIMIT ? `Showing the first ${MATCH_LIMIT} matches.` : `${matches.length} match${matches.length === 1 ? "" : "es"}.`;
    renderHighlights(text, matches);
    renderGroups(matches);
  }
  function renderHighlights(text, matches) {
    let cursor = 0;
    for (const m of matches) {
      if (m.index > cursor) preview.append(document.createTextNode(text.slice(cursor, m.index)));
      preview.append(el("mark", "match", m[0]));
      cursor = m.index + m[0].length;
    }
    if (cursor < text.length) preview.append(document.createTextNode(text.slice(cursor)));
  }
  function renderGroups(matches) {
    const hasGroups = matches.some((m) => m.length > 1 || m.groups);
    if (!hasGroups) return;
    matches.slice(0, 20).forEach((m, i) => {
      const block = el("div", "group-block");
      block.append(el("strong", "", `Match ${i + 1}: ${m[0]}`));
      for (let g = 1; g < m.length; g++) {
        block.append(el("div", "group-row", `  $${g} = ${m[g] ?? "(no match)"}`));
      }
      for (const [name, value] of Object.entries(m.groups ?? {})) {
        block.append(el("div", "group-row", `  ${name} = ${value ?? "(no match)"}`));
      }
      groups.append(block);
    });
  }
  live([pattern, flagsInput, subject], run);
  return wrapper(
    row(field("Pattern", pattern), field("Flags", flagsInput)),
    error,
    field("Test string", subject),
    summary,
    preview,
    groups
  );
}

// src/tools/HashTool.ts
var ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
function HashTool() {
  const input = textarea("Text to hash\u2026", 4);
  const algorithm = select(ALGORITHMS.map((a) => ({ value: a, label: a })));
  algorithm.value = "SHA-256";
  const result = el("code", "hash-output", "");
  const error = errorText();
  setError(error, null);
  const source = note("");
  source.style.display = "none";
  const fileInput = el("input", "input");
  fileInput.type = "file";
  async function hashText() {
    try {
      const digest = await digestHex(algorithm.value, new TextEncoder().encode(input.value));
      result.textContent = digest;
      source.textContent = `${algorithm.value} of ${input.value.length} character(s).`;
      source.style.display = "";
      setError(error, null);
    } catch (e) {
      setError(error, e instanceof Error ? e.message : String(e));
    }
  }
  async function hashFile() {
    const file = fileInput.files?.[0];
    if (!file) {
      setError(error, "Choose a file first.");
      return;
    }
    try {
      result.textContent = "Hashing\u2026";
      const bytes = new Uint8Array(await file.arrayBuffer());
      result.textContent = await digestHex(algorithm.value, bytes);
      source.textContent = `${algorithm.value} of ${file.name} (${formatBytes(file.size)}).`;
      source.style.display = "";
      setError(error, null);
    } catch (e) {
      result.textContent = "";
      setError(error, e instanceof Error ? e.message : String(e));
    }
  }
  algorithm.addEventListener("change", () => {
    if (fileInput.files?.length) void hashFile();
    else void hashText();
  });
  input.addEventListener("input", () => void hashText());
  fileInput.addEventListener("change", () => void hashFile());
  return wrapper(
    field("Algorithm", algorithm),
    field("Text", input),
    field("Or hash a file", fileInput),
    row(button("Hash text", () => void hashText(), "primary"), copyButton(() => result.textContent ?? "", "Copy digest")),
    error,
    field("Digest", result),
    source
  );
}
async function digestHex(algorithm, bytes) {
  const buffer = await crypto.subtle.digest(algorithm, bytes);
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// src/tools/UuidTool.ts
var SHORT_ID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZabcdefghijkmnopqrstuvwxyz-_";
function UuidTool() {
  const kind = select([
    { value: "uuid", label: "UUID v4" },
    { value: "uuid-upper", label: "UUID v4 (uppercase)" },
    { value: "uuid-bare", label: "UUID v4 (no dashes)" },
    { value: "short", label: "Short ID (NanoID style)" }
  ]);
  const count = textInput("5", "5");
  count.type = "number";
  count.min = "1";
  count.max = "500";
  const length = textInput("21", "21");
  length.type = "number";
  length.min = "4";
  length.max = "64";
  const lengthField = field("Short ID length", length);
  lengthField.style.display = "none";
  const result = textarea("", 8);
  result.readOnly = true;
  const summary = note("");
  function generate() {
    const n = clamp(parseInt(count.value, 10) || 1, 1, 500);
    const size = clamp(parseInt(length.value, 10) || 21, 4, 64);
    const values = [];
    for (let i = 0; i < n; i++) values.push(makeId(kind.value, size));
    result.value = values.join("\n");
    result.rows = Math.min(Math.max(values.length, 3), 12);
    summary.textContent = `Generated ${n} value${n === 1 ? "" : "s"}.`;
  }
  kind.addEventListener("change", () => {
    lengthField.style.display = kind.value === "short" ? "" : "none";
    generate();
  });
  count.addEventListener("input", generate);
  length.addEventListener("input", generate);
  generate();
  return wrapper(
    field("Type", kind),
    field("How many", count),
    lengthField,
    row(button("Generate", generate, "primary"), copyButton(() => result.value, "Copy all")),
    summary,
    field("Output", result)
  );
}
function makeId(kind, size) {
  switch (kind) {
    case "uuid-upper":
      return crypto.randomUUID().toUpperCase();
    case "uuid-bare":
      return crypto.randomUUID().replace(/-/g, "");
    case "short":
      return shortId(size);
    default:
      return crypto.randomUUID();
  }
}
function shortId(size) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let id = "";
  for (const byte of bytes) id += SHORT_ID_ALPHABET[byte % SHORT_ID_ALPHABET.length];
  return id;
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// src/tools/TimestampTool.ts
function TimestampTool() {
  const nowLine = note("");
  const epochInput = textInput("1700000000 or 1700000000000");
  const dateInput = textInput("2026-09-03T16:10:00Z or 'now'");
  const error = errorText();
  setError(error, null);
  const table = el("div", "kv-table");
  const timer = window.setInterval(() => {
    const now = Date.now();
    nowLine.textContent = `Now: ${Math.floor(now / 1e3)} s \xB7 ${now} ms \xB7 ${new Date(now).toLocaleString()}`;
  }, 1e3);
  window.addEventListener("unload", () => window.clearInterval(timer));
  function show(date) {
    if (Number.isNaN(date.getTime())) {
      setError(error, "That is not a date this tool can read.");
      table.replaceChildren();
      return;
    }
    setError(error, null);
    const ms = date.getTime();
    const rows = [
      ["Epoch (seconds)", String(Math.floor(ms / 1e3))],
      ["Epoch (milliseconds)", String(ms)],
      ["ISO 8601 (UTC)", date.toISOString()],
      ["Local time", date.toLocaleString()],
      ["UTC string", date.toUTCString()],
      ["Relative", relative(ms)],
      ["Time zone", Intl.DateTimeFormat().resolvedOptions().timeZone]
    ];
    table.replaceChildren();
    for (const [label, value] of rows) {
      const line = el("div", "kv-row");
      line.append(el("span", "kv-key", label), el("code", "kv-value", value));
      line.append(copyButton(() => value, "Copy"));
      table.append(line);
    }
  }
  epochInput.addEventListener("input", () => {
    const raw = epochInput.value.trim();
    if (!raw) {
      setError(error, null);
      table.replaceChildren();
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setError(error, "Enter a number of seconds or milliseconds.");
      return;
    }
    show(new Date(Math.abs(n) < 1e11 ? n * 1e3 : n));
  });
  dateInput.addEventListener("input", () => {
    const raw = dateInput.value.trim();
    if (!raw) {
      setError(error, null);
      table.replaceChildren();
      return;
    }
    show(raw.toLowerCase() === "now" ? /* @__PURE__ */ new Date() : new Date(raw));
  });
  const nowBtn = button(
    "Use current time",
    () => {
      const now = /* @__PURE__ */ new Date();
      epochInput.value = String(Math.floor(now.getTime() / 1e3));
      dateInput.value = now.toISOString();
      show(now);
    },
    "primary"
  );
  show(/* @__PURE__ */ new Date());
  return wrapper(
    nowLine,
    field("From epoch", epochInput),
    field("From date string", dateInput),
    row(nowBtn),
    error,
    table
  );
}

// src/tools/registry.ts
var TOOLS = [
  { id: "json", label: "JSON Formatter", group: "Text & Encoding", surface: "both", mount: JsonTool },
  { id: "base64", label: "Base64 Encode/Decode", group: "Text & Encoding", surface: "both", mount: Base64Tool },
  { id: "jwt", label: "JWT Decoder", group: "Text & Encoding", surface: "both", mount: JwtTool },
  { id: "url", label: "URL & Query String", group: "Text & Encoding", surface: "both", mount: UrlTool },
  { id: "case", label: "Case Converter", group: "Text & Encoding", surface: "both", mount: CaseTool },
  { id: "regex", label: "Regex Tester", group: "Text & Encoding", surface: "both", mount: RegexTool },
  { id: "hash", label: "Hash Generator", group: "Generators", surface: "both", mount: HashTool },
  { id: "uuid", label: "UUID Generator", group: "Generators", surface: "both", mount: UuidTool },
  { id: "timestamp", label: "Timestamp Converter", group: "Generators", surface: "both", mount: TimestampTool },
  // Dynamically imported so pdf-lib (~800kb) never lands in the popup bundle.
  {
    id: "pdf-merge",
    label: "PDF Merge",
    group: "Files",
    surface: "page",
    mount: async () => (await import("./PdfMergeTool-RQAHOG4J.js")).PdfMergeTool()
  },
  { id: "color", label: "Color Picker", group: "Color", surface: "both", mount: ColorTool }
];
var GROUP_ORDER = ["Text & Encoding", "Generators", "Files", "Color"];
function getTool(id) {
  return TOOLS.find((t) => t.id === id);
}
function toolsForSurface(surface) {
  return TOOLS.filter((t) => t.surface === "both" || t.surface === surface);
}
function groupedTools(tools) {
  return GROUP_ORDER.map((group) => ({
    group,
    tools: tools.filter((t) => t.group === group)
  })).filter((g) => g.tools.length > 0);
}
function pageUrl(toolId) {
  const base = "src/pages/toolbox.html";
  return chrome.runtime.getURL(toolId ? `${base}#${toolId}` : base);
}

export {
  TOOLS,
  GROUP_ORDER,
  getTool,
  toolsForSurface,
  groupedTools,
  pageUrl
};
//# sourceMappingURL=chunk-5R2GIOIL.js.map
