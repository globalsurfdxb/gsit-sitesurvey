import { z } from "zod";
import type { BlockDef, FormSchema } from "./types";

// Shared by the API (validation) and the form builder (pickers + early feedback).

export const TONES = ["blue", "indigo", "teal", "green", "slate", "purple", "amber", "orange", "rose"] as const;

/** Icons a section or department can use (all exist in the app's icon set). */
export const PICKABLE_ICONS = [
  "clipboard", "briefcase", "building", "map-pin", "plug", "server", "network", "wifi", "cpu", "database",
  "video", "monitor", "speaker", "lock", "shield", "user-check", "zap", "package", "users", "layers", "sliders", "file", "camera", "cloud",
] as const;

const str = (max: number) => z.string().trim().max(max);
const label = str(200).min(1);
const keyStr = z.string().min(1).max(120).regex(/^[A-Za-z0-9_.\-]+$/, "Invalid field key");
const options = z.array(str(120).min(1)).min(1).max(100);

const textLike = z.object({ t: z.enum(["text", "textarea", "number"]), key: keyStr, label, placeholder: str(200).optional(), required: z.boolean().optional() });

const blockZ = z.discriminatedUnion("t", [
  z.object({ t: z.literal("heading"), text: label }),
  textLike,
  z.object({ t: z.literal("date"), key: keyStr, label, required: z.boolean().optional(), defaultToday: z.boolean().optional() }),
  z.object({ t: z.literal("select"), key: keyStr, label, options, required: z.boolean().optional() }),
  z.object({ t: z.literal("choice"), key: keyStr, label, options, multi: z.boolean(), required: z.boolean().optional() }),
  z.object({ t: z.literal("check"), key: keyStr, label, options }),
  z.object({ t: z.literal("routes"), key: keyStr, placeholders: z.array(z.array(str(80)).max(4)).max(20) }),
  z.object({
    t: z.literal("accessories"),
    key: keyStr,
    rows: z.array(z.object({ key: keyStr, label, options: z.array(z.object({ value: str(80).min(1), label })).max(60) })).max(60),
  }),
  z.object({ t: z.literal("qtyList"), key: keyStr, items: z.array(z.object({ key: keyStr, label })).max(100) }),
  z.object({ t: z.literal("choiceQty"), key: keyStr, label, yn: z.boolean(), qty: z.boolean() }),
  z.object({ t: z.literal("photos"), key: keyStr, slots: z.array(z.object({ key: keyStr, label })).min(1).max(30) }),
  z.object({ t: z.literal("upload"), key: keyStr, label, typeOptions: z.array(str(80).min(1)).max(40) }),
  z.object({
    t: z.literal("dataPoints"),
    key: keyStr,
    groups: z.array(z.object({ group: label, color: str(40), items: z.array(str(120).min(1)).max(60) })).max(30),
  }),
  z.object({ t: z.literal("materials"), key: keyStr, defaults: z.array(str(160).min(1)).max(100) }),
  z.object({ t: z.literal("manpower"), key: keyStr, roles: z.array(str(80).min(1)).max(40) }),
  z.object({ t: z.literal("cameraSets"), key: keyStr }),
]);

const sectionZ = z.object({
  key: keyStr,
  title: label,
  subtitle: str(300).default(""),
  icon: z.string().max(16).optional(),
  iconName: z.string().max(40).optional(),
  tone: z.enum(TONES).catch("blue"),
  short: str(24).optional(),
  scope: z.enum(["always", "default", "optional"]).optional(),
  support: z.boolean().optional(),
  blocks: z.array(blockZ).max(500),
});

export const formSchemaZ = z.object({
  title: label,
  subtitle: str(300).default(""),
  meta: z
    .object({
      refKey: keyStr.optional(),
      clientKey: keyStr.optional(),
      siteKey: keyStr.optional(),
      engineerKey: keyStr.optional(),
      dateKey: keyStr.optional(),
    })
    .default({}),
  sections: z.array(sectionZ).min(1).max(40),
});

/** Human-readable problems that make a form unusable (duplicate keys, dangling references…). Empty = fine. */
export function findFormProblems(form: FormSchema): string[] {
  const problems: string[] = [];
  const sectionKeys = new Set<string>();
  const blockKeys = new Set<string>();
  for (const s of form.sections) {
    if (sectionKeys.has(s.key)) problems.push(`Two sections share the key “${s.key}”.`);
    sectionKeys.add(s.key);
    for (const b of s.blocks) {
      if (!("key" in b)) continue;
      if (blockKeys.has(b.key)) problems.push(`Two fields share the key “${b.key}”.`);
      blockKeys.add(b.key);
    }
  }
  for (const [name, k] of Object.entries(form.meta)) {
    if (k && !blockKeys.has(k)) problems.push(`The “${name}” setting points at a field that no longer exists.`);
  }
  return problems;
}

/** A new, empty form: client and site details plus notes, ready to be customised. */
export function blankForm(title: string): FormSchema {
  const id = () => Math.random().toString(36).slice(2, 8);
  const [a, b, c, d, e, f] = [id(), id(), id(), id(), id(), id()];
  return {
    title,
    subtitle: "",
    meta: { refKey: `details.${a}`, clientKey: `details.${b}`, siteKey: `details.${c}`, dateKey: `details.${d}`, engineerKey: `details.${e}` },
    sections: [
      {
        key: "details",
        title: "Client & site",
        subtitle: "Who and where",
        iconName: "briefcase",
        tone: "blue",
        short: "Details",
        scope: "always",
        blocks: [
          { t: "text", key: `details.${a}`, label: "Reference ID", placeholder: "e.g. GS-2026-0001", required: true },
          { t: "text", key: `details.${b}`, label: "Client / company", required: true },
          { t: "text", key: `details.${c}`, label: "Site address" },
          { t: "date", key: `details.${d}`, label: "Survey date", required: true, defaultToday: true },
          { t: "text", key: `details.${e}`, label: "Surveyed by", required: true },
        ],
      },
      {
        key: "notes",
        title: "Notes",
        subtitle: "Anything else worth recording",
        iconName: "file",
        tone: "slate",
        short: "Notes",
        scope: "always",
        blocks: [{ t: "textarea", key: `notes.${f}`, label: "Observations", placeholder: "Site conditions, constraints, follow-ups…" }],
      },
    ],
  };
}

export type { BlockDef };
