"use strict";
(() => {
  // src/tools/ColorTool.ts
  function ColorTool() {
    const wrapper = document.createElement("div");
    const input = document.createElement("input");
    input.type = "color";
    const hex = document.createElement("p");
    const rgb = document.createElement("p");
    input.addEventListener("input", () => {
      hex.textContent = `Hex: ${input.value}`;
      const r = parseInt(input.value.slice(1, 3), 16);
      const g = parseInt(input.value.slice(3, 5), 16);
      const b = parseInt(input.value.slice(5, 7), 16);
      rgb.textContent = `RGB: rgb(${r}, ${g}, ${b})`;
    });
    wrapper.append(input, hex, rgb);
    return wrapper;
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
