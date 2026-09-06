import { PDFDocument } from "pdf-lib"
import { decryptDocument } from "./pdfDecrypt"
import {
  button,
  downloadBlob,
  el,
  errorText,
  formatBytes,
  note,
  setError,
  textInput,
  wrapper
} from "../ui/kit"

/** Raised when a file needs a password we do not have. */
class PdfPasswordError extends Error {}

/**
 * Loads a PDF, decrypting it when necessary.
 *
 * pdf-lib parses encrypted documents but never decrypts them, so without this
 * step a permission-restricted file would copy across as ciphertext and render
 * as blank pages.
 */
async function loadPdf(bytes: Uint8Array): Promise<{ doc: PDFDocument; wasEncrypted: boolean }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const outcome = await decryptDocument(doc)

  switch (outcome.status) {
    case "not-encrypted":
      return { doc, wasEncrypted: false }
    case "decrypted":
      return { doc, wasEncrypted: true }
    case "needs-password":
      throw new PdfPasswordError("Password-protected — open it and save a copy without the password.")
    case "unsupported":
      throw new PdfPasswordError(outcome.reason)
  }
}

interface PdfItem {
  id: string
  name: string
  size: number
  bytes: Uint8Array
  pageCount: number
  /** Empty means "all pages". */
  range: string
  /** Set when `range` is present but unparseable for this file. */
  rangeError: string | null
  /** True when the file was encrypted and we unlocked it to read the content. */
  wasEncrypted: boolean
  error: string | null
}

export function PdfMergeTool(): HTMLElement {
  const items: PdfItem[] = []

  const dropZone = el("div", "drop-zone")
  dropZone.append(
    el("strong", "", "Drop PDF files here"),
    el("span", "", "or click to choose — they merge in the order listed below")
  )

  const fileInput = el("input", "hidden-file")
  fileInput.type = "file"
  fileInput.multiple = true
  fileInput.accept = "application/pdf,.pdf"

  const list = el("div", "pdf-list")
  const emptyNote = note("No files added yet.")

  const outputName = textInput("merged.pdf", "merged.pdf")

  const status = note("")
  status.style.display = "none"

  const error = errorText()
  setError(error, null)

  const mergeBtn = button("Merge PDFs", () => void merge(), "primary")
  mergeBtn.disabled = true

  const clearBtn = button("Clear all", () => {
    items.length = 0
    render()
  })

  // --- File intake -------------------------------------------------------

  dropZone.addEventListener("click", () => fileInput.click())

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault()
    dropZone.classList.add("dragging")
  })
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"))
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault()
    dropZone.classList.remove("dragging")
    if (event.dataTransfer?.files) void addFiles(event.dataTransfer.files)
  })

  fileInput.addEventListener("change", () => {
    if (fileInput.files) void addFiles(fileInput.files)
    // Reset so re-picking the same file still fires a change event.
    fileInput.value = ""
  })

  async function addFiles(fileList: FileList) {
    setError(error, null)
    const files = [...fileList].filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    )

    if (files.length === 0) {
      setError(error, "Those files are not PDFs.")
      return
    }

    status.textContent = `Reading ${files.length} file(s)…`
    status.style.display = ""

    for (const file of files) {
      const item: PdfItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        bytes: new Uint8Array(),
        pageCount: 0,
        range: "",
        rangeError: null,
        wasEncrypted: false,
        error: null
      }

      try {
        item.bytes = new Uint8Array(await file.arrayBuffer())
        const { doc, wasEncrypted } = await loadPdf(item.bytes)
        item.pageCount = doc.getPageCount()
        item.wasEncrypted = wasEncrypted
      } catch (e) {
        item.error = describeLoadError(e)
      }
      items.push(item)
    }

    status.style.display = "none"
    render()
  }

  // --- Rendering ---------------------------------------------------------

  function render() {
    list.replaceChildren()
    emptyNote.style.display = items.length === 0 ? "" : "none"

    items.forEach((item, index) => list.append(itemRow(item, index)))
    updateSummary()
  }

  /**
   * Refreshes the status line and Merge button without rebuilding rows, so
   * editing a page range does not steal focus from the field being typed in.
   */
  function updateSummary() {
    const usable = items.filter((i) => !i.error)
    const broken = usable.filter((i) => i.rangeError)

    mergeBtn.disabled = usable.length === 0 || broken.length > 0

    if (usable.length === 0) {
      status.style.display = "none"
      return
    }

    if (broken.length > 0) {
      status.textContent = `Fix the highlighted page range${broken.length === 1 ? "" : "s"} before merging.`
      status.style.display = ""
      return
    }

    const total = usable.reduce((sum, i) => sum + countPages(i), 0)
    status.textContent = `${usable.length} file(s) ready · ${total} page(s) in the merged document.`
    status.style.display = ""
  }

  function itemRow(item: PdfItem, index: number): HTMLElement {
    const rowEl = el("div", item.error ? "pdf-row pdf-row-error" : "pdf-row")

    const order = el("span", "pdf-order", String(index + 1))

    const meta = el("span", "pdf-meta")
    const info = el("div", "pdf-info")
    info.append(el("span", "pdf-name", item.name), meta)

    const range = textInput("all pages", item.range)
    range.className = "input pdf-range"
    range.title = "Pages to take from this file, e.g. 1-3,5. Leave blank for all."
    range.disabled = !!item.error

    function refreshMeta() {
      if (item.error) {
        meta.textContent = item.error
        return
      }
      let base = `${item.pageCount} page${item.pageCount === 1 ? "" : "s"} · ${formatBytes(item.size)}`
      if (item.wasEncrypted) base += " · restricted, unlocked"
      meta.textContent = item.rangeError ? `${base} · ${item.rangeError}` : base
      range.classList.toggle("invalid", !!item.rangeError)
      rowEl.classList.toggle("pdf-row-warn", !!item.rangeError)
    }

    range.addEventListener("input", () => {
      item.range = range.value
      item.rangeError = validateRange(item)
      // Update this row in place; a full render would drop keyboard focus.
      refreshMeta()
      updateSummary()
    })

    refreshMeta()

    const up = button("^", () => move(index, -1))
    up.className = "btn btn-icon"
    up.title = "Move up"
    up.disabled = index === 0

    const down = button("v", () => move(index, 1))
    down.className = "btn btn-icon"
    down.title = "Move down"
    down.disabled = index === items.length - 1

    const remove = button("x", () => {
      items.splice(index, 1)
      render()
    })
    remove.className = "btn btn-icon"
    remove.title = "Remove"

    const controls = el("div", "pdf-controls")
    controls.append(range, up, down, remove)

    rowEl.append(order, info, controls)
    return rowEl
  }

  /** Returns a human-readable problem with the item's range, or null if fine. */
  function validateRange(item: PdfItem): string | null {
    if (!item.range.trim()) return null
    try {
      parseRange(item.range, item.pageCount)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid page range."
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const [item] = items.splice(index, 1)
    items.splice(target, 0, item)
    render()
  }

  function countPages(item: PdfItem): number {
    if (!item.range.trim()) return item.pageCount
    try {
      return parseRange(item.range, item.pageCount).length
    } catch {
      return 0
    }
  }

  // --- Merge -------------------------------------------------------------

  async function merge() {
    const usable = items.filter((i) => !i.error)
    if (usable.length === 0) return

    mergeBtn.disabled = true
    status.textContent = "Merging…"
    status.style.display = ""
    setError(error, null)

    try {
      const merged = await PDFDocument.create()
      const failures: string[] = []

      for (const item of usable) {
        try {
          const { doc: source } = await loadPdf(item.bytes)
          const indices = item.range.trim()
            ? parseRange(item.range, source.getPageCount())
            : source.getPageIndices()

          // copyPages deep-copies each page's resources (fonts, images, annots)
          // into the target document; addPage then appends them in order.
          const copied = await merged.copyPages(source, indices)
          for (const page of copied) merged.addPage(page)
        } catch (e) {
          failures.push(`${item.name}: ${describeLoadError(e)}`)
        }
      }

      if (merged.getPageCount() === 0) {
        setError(error, `Nothing could be merged.\n${failures.join("\n")}`)
        status.style.display = "none"
        return
      }

      const bytes = await merged.save()
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })
      downloadBlob(blob, normalizeName(outputName.value))

      status.textContent = `Merged ${merged.getPageCount()} page(s) into ${normalizeName(outputName.value)} (${formatBytes(blob.size)}).`
      if (failures.length > 0) setError(error, `Skipped:\n${failures.join("\n")}`)
    } catch (e) {
      setError(error, e instanceof Error ? e.message : String(e))
      status.style.display = "none"
    } finally {
      const usable = items.filter((i) => !i.error)
      mergeBtn.disabled = usable.length === 0 || usable.some((i) => i.rangeError)
    }
  }

  const nameRow = el("div", "row")
  nameRow.append(el("label", "field-label", "Output file name"), outputName, mergeBtn, clearBtn)

  render()

  return wrapper(
    dropZone,
    fileInput,
    emptyNote,
    list,
    nameRow,
    status,
    error,
    note("Everything happens locally in your browser — no file ever leaves your machine.")
  )
}

function normalizeName(value: string): string {
  const trimmed = value.trim() || "merged.pdf"
  return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`
}

function describeLoadError(e: unknown): string {
  if (e instanceof PdfPasswordError) return e.message
  const message = e instanceof Error ? e.message : String(e)
  if (/Failed to parse|No PDF header|Invalid object|stream/i.test(message)) return "Not a readable PDF."
  return message
}

/**
 * Turns a 1-based page spec like "1-3,5" into 0-based page indices.
 * Open-ended ranges ("3-") run to the last page.
 */
export function parseRange(spec: string, pageCount: number): number[] {
  const indices: number[] = []

  for (const part of spec.split(",")) {
    const chunk = part.trim()
    if (!chunk) continue

    const match = /^(\d+)\s*(-)\s*(\d+)?$/.exec(chunk)
    if (match) {
      const start = Number(match[1])
      const end = match[3] ? Number(match[3]) : pageCount
      if (start < 1 || end > pageCount || start > end) {
        throw new Error(`Range "${chunk}" is outside 1-${pageCount}.`)
      }
      for (let p = start; p <= end; p++) indices.push(p - 1)
      continue
    }

    if (!/^\d+$/.test(chunk)) throw new Error(`"${chunk}" is not a page number.`)
    const page = Number(chunk)
    if (page < 1 || page > pageCount) {
      throw new Error(`Page ${page} is outside 1-${pageCount}.`)
    }
    indices.push(page - 1)
  }

  if (indices.length === 0) throw new Error("No pages selected.")
  return indices
}
