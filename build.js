// build.js
const esbuild = require("esbuild")
const fs = require("node:fs")

const watch = process.argv.includes("--watch")

// Chunk names are content-hashed, so old ones would pile up on every build.
fs.rmSync("src/chunks", { recursive: true, force: true })

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ["src/popup/popup.ts", "src/pages/toolbox.ts"],
  bundle: true,
  outdir: "src",
  outbase: "src",
  format: "esm",
  // Keeps pdf-lib in its own chunk, loaded only when the PDF tool is opened.
  splitting: true,
  chunkNames: "chunks/[name]-[hash]",
  target: ["chrome110"],
  sourcemap: true,
  minify: false,
  logLevel: "info"
}

async function run() {
  if (watch) {
    const ctx = await esbuild.context(options)
    await ctx.watch()
    console.log("watching for changes… (ctrl-c to stop)")
    return
  }

  await esbuild.build(options)
}

run().catch(() => process.exit(1))
