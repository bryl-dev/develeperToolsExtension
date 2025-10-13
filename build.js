// build.js
const esbuild = require("esbuild")

esbuild.build({
  entryPoints: ["src/popup/popup.ts"],
  bundle: true,
  outfile: "src/popup/popup.js",
  sourcemap: true,
  minify: false
}).catch(() => process.exit(1))
