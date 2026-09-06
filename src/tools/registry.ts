import { ColorTool } from "./ColorTool"
import { JsonTool } from "./JsonTool"
import { Base64Tool } from "./Base64Tool"
import { JwtTool } from "./JwtTool"
import { UrlTool } from "./UrlTool"
import { CaseTool } from "./CaseTool"
import { RegexTool } from "./RegexTool"
import { HashTool } from "./HashTool"
import { UuidTool } from "./UuidTool"
import { TimestampTool } from "./TimestampTool"

/**
 * Where a tool can be mounted. Tools that need real estate or that would lose
 * state if the popup dismissed are marked "page" and open in a tab instead.
 */
export type Surface = "popup" | "page" | "both"

export type ToolGroup = "Text & Encoding" | "Generators" | "Files" | "Color"

export interface ToolDef {
  id: string
  label: string
  group: ToolGroup
  surface: Surface
  /** May be async so a heavy tool can be code-split out of the popup bundle. */
  mount: () => HTMLElement | Promise<HTMLElement>
}

export const TOOLS: ToolDef[] = [
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
    mount: async () => (await import("./PdfMergeTool")).PdfMergeTool()
  },

  { id: "color", label: "Color Picker", group: "Color", surface: "both", mount: ColorTool }
]

export const GROUP_ORDER: ToolGroup[] = ["Text & Encoding", "Generators", "Files", "Color"]

export function getTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id)
}

export function toolsForSurface(surface: "popup" | "page"): ToolDef[] {
  return TOOLS.filter((t) => t.surface === "both" || t.surface === surface)
}

export function groupedTools(tools: ToolDef[]): { group: ToolGroup; tools: ToolDef[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    tools: tools.filter((t) => t.group === group)
  })).filter((g) => g.tools.length > 0)
}

/** Path to the full-page surface, optionally deep-linked to a tool. */
export function pageUrl(toolId?: string): string {
  const base = "src/pages/toolbox.html"
  return chrome.runtime.getURL(toolId ? `${base}#${toolId}` : base)
}
