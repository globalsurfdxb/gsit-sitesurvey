import type { BlockDef, FormSchema, SectionDef } from "@/lib/types";

// Pure helpers for the form builder (no React), so they're easy to test.

export type FieldKind = "text" | "textarea" | "number" | "date" | "select" | "choice-one" | "choice-many" | "check" | "photos" | "upload" | "materials" | "manpower";

export const FIELD_KINDS: { kind: FieldKind; label: string; hint: string }[] = [
  { kind: "text", label: "Short text", hint: "A name, number or one line" },
  { kind: "textarea", label: "Long text", hint: "Notes and descriptions" },
  { kind: "number", label: "Number", hint: "Quantities, distances" },
  { kind: "date", label: "Date", hint: "Picks a calendar date" },
  { kind: "select", label: "Dropdown", hint: "Choose one from a list" },
  { kind: "choice-one", label: "Choose one", hint: "Buttons, one answer" },
  { kind: "choice-many", label: "Choose several", hint: "Buttons, many answers" },
  { kind: "check", label: "Checklist row", hint: "Y / N / N/A style row" },
  { kind: "photos", label: "Photos", hint: "Named camera slots" },
  { kind: "upload", label: "File upload", hint: "Drawings, documents" },
  { kind: "materials", label: "Material list", hint: "Items with quantities" },
  { kind: "manpower", label: "Manpower plan", hint: "Roles, days and hours" },
];

export const SCOPE_LABEL: Record<NonNullable<SectionDef["scope"]>, string> = {
  always: "Always included",
  default: "Optional · on by default",
  optional: "Optional · off by default",
};

export const rid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-2);

const taken = (form: FormSchema) => new Set(form.sections.map((s) => s.key));
export function newSectionKey(form: FormSchema): string {
  const used = taken(form);
  let k = `s_${rid()}`;
  while (used.has(k)) k = `s_${rid()}`;
  return k;
}

export function newSection(form: FormSchema): SectionDef {
  return { key: newSectionKey(form), title: "New section", subtitle: "", iconName: "clipboard", tone: "blue", short: "Section", scope: "always", blocks: [] };
}

export function newBlock(kind: FieldKind, sectionKey: string): BlockDef {
  const key = `${sectionKey}.f_${rid()}`;
  switch (kind) {
    case "text":
    case "textarea":
    case "number":
      return { t: kind, key, label: "New field" };
    case "date":
      return { t: "date", key, label: "New date" };
    case "select":
      return { t: "select", key, label: "New dropdown", options: ["Option 1", "Option 2"] };
    case "choice-one":
      return { t: "choice", key, label: "New question", options: ["Yes", "No"], multi: false };
    case "choice-many":
      return { t: "choice", key, label: "New question", options: ["Option 1", "Option 2"], multi: true };
    case "check":
      return { t: "check", key, label: "New check", options: ["Y", "N", "N/A"] };
    case "photos":
      return { t: "photos", key, slots: [{ key: `p_${rid()}`, label: "Photo 1" }] };
    case "upload":
      return { t: "upload", key, label: "Attachments", typeOptions: ["Drawing", "Datasheet", "Other"] };
    case "materials":
      return { t: "materials", key, defaults: [] };
    case "manpower":
      return { t: "manpower", key, roles: ["Engineer", "Technician", "Helper"] };
  }
}

/** What the builder can edit about a block; anything else (the ELV specials) is move / delete only. */
export type BlockKind = FieldKind | "heading" | "special";
export function kindOf(b: BlockDef): BlockKind {
  switch (b.t) {
    case "heading":
    case "text":
    case "textarea":
    case "number":
    case "date":
    case "select":
    case "check":
    case "photos":
    case "upload":
    case "materials":
    case "manpower":
      return b.t;
    case "choice":
      return b.multi ? "choice-many" : "choice-one";
    default:
      return "special";
  }
}

export const kindLabel = (b: BlockDef) => (kindOf(b) === "heading" ? "Group heading" : kindOf(b) === "special" ? specialLabel(b) : (FIELD_KINDS.find((k) => k.kind === kindOf(b))?.label ?? b.t));
const specialLabel = (b: BlockDef) =>
  ({ routes: "Cable routes", accessories: "Accessories", qtyList: "Quantity list", choiceQty: "Choice + quantity", dataPoints: "Data points", cameraSets: "Camera sets" })[b.t as string] ?? b.t;

export const hasRequired = (b: BlockDef) => ["text", "textarea", "number", "date", "select", "choice"].includes(b.t);

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = list.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

/** A copy of a block with fresh keys, so duplicating a field doesn't make two fields share answers. */
export function cloneBlock(b: BlockDef, sectionKey: string): BlockDef {
  const c = structuredClone(b);
  if ("key" in c) c.key = `${sectionKey}.f_${rid()}`;
  if (c.t === "photos") c.slots = c.slots.map((s) => ({ ...s, key: `p_${rid()}` }));
  if (c.t === "heading") return c;
  if ("label" in c) c.label = `${c.label} (copy)`;
  return c;
}

/** All fields of the given types, for the "key fields" pickers. */
export function fieldsOfType(form: FormSchema, types: BlockDef["t"][]) {
  return form.sections.flatMap((s) => s.blocks.flatMap((b) => (types.includes(b.t) && "key" in b && "label" in b ? [{ key: b.key, label: `${s.title} › ${b.label}` }] : [])));
}

/** Drop key-field settings that point at a field that no longer exists. */
export function pruneMeta(form: FormSchema): FormSchema {
  const keys = new Set(form.sections.flatMap((s) => s.blocks.flatMap((b) => ("key" in b ? [b.key] : []))));
  const meta = Object.fromEntries(Object.entries(form.meta).filter(([, v]) => v && keys.has(v)));
  return { ...form, meta };
}

/** Problems the author should fix before saving. Empty = fine. */
export function checkForm(form: FormSchema): string[] {
  const out: string[] = [];
  if (form.sections.length === 0) out.push("Add at least one section.");
  for (const s of form.sections) {
    if (!s.title.trim()) out.push("Every section needs a title.");
    for (const b of s.blocks) {
      if (b.t === "heading" && !b.text.trim()) out.push(`A group heading in “${s.title}” is empty.`);
      if ("label" in b && !b.label.trim()) out.push(`A field in “${s.title}” has no label.`);
      if ((b.t === "select" || b.t === "choice" || b.t === "check") && b.options.filter((o) => o.trim()).length === 0) out.push(`“${b.label}” needs at least one option.`);
      if (b.t === "photos" && b.slots.some((p) => !p.label.trim())) out.push(`A photo slot in “${s.title}” has no name.`);
    }
  }
  return [...new Set(out)];
}
