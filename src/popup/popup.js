"use strict";
(() => {
  // src/tools/ColorTool.ts
  function ColorTool() {
    const wrapper = document.createElement("div");
    wrapper.className = "tool color-tool";
    const input = document.createElement("input");
    input.type = "color";
    const pickButton = document.createElement("button");
    pickButton.textContent = "Pick from page";
    const copyButton = document.createElement("button");
    copyButton.textContent = "Copy HEX";
    const output = document.createElement("p");
    output.textContent = "Pick a color\u2026";
    let currentHex = null;
    input.addEventListener("input", () => {
      showColor(input.value);
    });
    pickButton.addEventListener("click", async () => {
      const hex = await pickColorFromPage();
      if (hex) {
        input.value = hex;
        showColor(hex);
      }
    });
    copyButton.addEventListener("click", () => {
      if (currentHex) {
        navigator.clipboard.writeText(currentHex).then(() => {
          copyButton.textContent = "Copied!";
          setTimeout(() => copyButton.textContent = "Copy HEX", 1e3);
        });
      }
    });
    function showColor(hex) {
      currentHex = hex;
      output.textContent = `HEX: ${hex}, RGB: ${hexToRgb(hex)}`;
    }
    wrapper.appendChild(input);
    wrapper.appendChild(pickButton);
    wrapper.appendChild(copyButton);
    wrapper.appendChild(output);
    return wrapper;
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
    const wrapper = document.createElement("div");
    const textarea = document.createElement("textarea");
    textarea.rows = 5;
    textarea.style.width = "100%";
    const button = document.createElement("button");
    button.textContent = "Format JSON";
    const output = document.createElement("pre");
    button.addEventListener("click", () => {
      try {
        const parsed = JSON.parse(textarea.value);
        output.textContent = JSON.stringify(parsed, null, 2);
      } catch {
        output.textContent = "\u274C Invalid JSON";
      }
    });
    wrapper.append(textarea, button, output);
    return wrapper;
  }

  // src/popup/popup.ts
  var select = document.getElementById("toolSelect");
  var container = document.getElementById("toolContainer");
  select.addEventListener("change", () => {
    container.innerHTML = "";
    switch (select.value) {
      case "color":
        container.appendChild(ColorTool());
        break;
      case "json":
        container.appendChild(JsonTool());
        break;
    }
  });
})();
//# sourceMappingURL=popup.js.map
