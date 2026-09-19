export const STRUCTURE_LANES = [
  { id: "xai", label: "xAI", model: "grok-4-fast" },
  { id: "grok", label: "Grok", model: "grok-4.6" },
  { id: "gemini", label: "Gemini Flash", model: "gemini-3.5-flash" },
] as const;

export type StructureLane = (typeof STRUCTURE_LANES)[number]["id"];

export function parseStructureLane(raw: unknown): StructureLane {
  return STRUCTURE_LANES.some(l => l.id === raw) ? (raw as StructureLane) : "gemini";
}

export function laneMeta(id: StructureLane) {
  return STRUCTURE_LANES.find(l => l.id === id) ?? STRUCTURE_LANES[2];
}
