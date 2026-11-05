import raw from "@/data/survey-schema.json";
import type { BlockDef, CameraSet, FileRef, SectionDef, SessionUser, SurveySchema, UploadValue, Values } from "./types";

export const schema = raw as unknown as SurveySchema;

export const SKIPPED_KEY = "_skipped";

// Keys the app relies on for list titles / header. They come from the generated schema.
const K = {
  dealId: "client.gs_it_internal.deal_id",
  engineer: "client.gs_it_internal.survey_engineer",
  date: "client.gs_it_internal.survey_date",
  clientName: "client.client_details.client_name",
  siteAddress: "site.site_address",
};

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function surveyTitle(values: Values): string {
  const deal = str(values[K.dealId]);
  const client = str(values[K.clientName]);
  if (deal && client) return `${deal} — ${client}`;
  return deal || client || "Untitled survey";
}

export function surveySubtitle(values: Values): string {
  return [str(values[K.siteAddress]), str(values[K.date])].filter(Boolean).join(" · ");
}

// ───────────── Initial values ─────────────

export const DEFAULT_CAMERA_BRAND = "Hikvision";

export function newCameraSet(): CameraSet {
  return { id: uid(), type: [], brand: [DEFAULT_CAMERA_BRAND], resolution: [], night: [], audio: [], ai: [], qty: "" };
}

export function createInitialValues(user?: Pick<SessionUser, "name">): Values {
  const v: Values = {};
  for (const sec of schema.sections) {
    for (const b of sec.blocks) {
      if (b.t === "date" && b.defaultToday) v[b.key] = todayISO();
      if (b.t === "materials") v[b.key] = b.defaults.map((name) => ({ id: uid(), name, qty: "1", done: false }));
      if (b.t === "cameraSets") v[b.key] = [newCameraSet()];
      if (b.t === "routes") v[b.key] = b.placeholders.map(() => ({ from: "", to: "", distance: "" }));
      if (b.t === "manpower") v[b.key] = [];
    }
  }
  if (user?.name) v[K.engineer] = user.name;
  v[SKIPPED_KEY] = [];
  return v;
}

// ───────────── Answered / required logic ─────────────

const nonEmpty = (s: unknown) => typeof s === "string" && s.trim() !== "";
const anyValue = (o: unknown) => !!o && typeof o === "object" && Object.values(o as object).some((x) => nonEmpty(x));

export function isInputBlock(b: BlockDef): boolean {
  return b.t !== "heading";
}

export function isAnswered(b: BlockDef, v: unknown): boolean {
  switch (b.t) {
    case "heading":
      return false;
    case "text":
    case "textarea":
    case "number":
    case "date":
    case "select":
    case "check":
      return nonEmpty(v);
    case "choice":
      return Array.isArray(v) ? v.length > 0 : nonEmpty(v);
    case "routes":
      return Array.isArray(v) && v.some((r) => anyValue(r));
    case "accessories":
      return !!v && typeof v === "object" && Object.values(v as object).some((row) => !!row && Object.keys(row as object).length > 0);
    case "qtyList":
    case "dataPoints":
      return anyValue(v);
    case "choiceQty": {
      const c = (v ?? {}) as { yn?: string; qty?: string };
      return nonEmpty(c.yn) || nonEmpty(c.qty);
    }
    case "photos":
      return !!v && typeof v === "object" && Object.keys(v as object).length > 0;
    case "upload": {
      const u = v as UploadValue | undefined;
      return !!u && (u.files?.length ?? 0) > 0;
    }
    case "materials":
    case "manpower":
      return Array.isArray(v) && v.length > 0;
    case "cameraSets":
      return (
        Array.isArray(v) &&
        (v as CameraSet[]).some((s) => nonEmpty(s.qty) || s.type.length > 0 || s.resolution.length > 0 || s.night.length > 0 || s.audio.length > 0 || s.ai.length > 0)
      );
  }
}

export function isRequired(b: BlockDef): boolean {
  return "required" in b && !!b.required;
}

export function isSkipped(values: Values, sectionKey: string): boolean {
  const s = values[SKIPPED_KEY];
  return Array.isArray(s) && s.includes(sectionKey);
}

export interface SectionStats {
  answered: number;
  total: number;
  requiredDone: number;
  requiredTotal: number;
}

export function sectionStats(sec: SectionDef, values: Values): SectionStats {
  const st: SectionStats = { answered: 0, total: 0, requiredDone: 0, requiredTotal: 0 };
  for (const b of sec.blocks) {
    if (!isInputBlock(b)) continue;
    const key = (b as { key: string }).key;
    const ans = isAnswered(b, values[key]);
    st.total++;
    if (ans) st.answered++;
    if (isRequired(b)) {
      st.requiredTotal++;
      if (ans) st.requiredDone++;
    }
  }
  return st;
}

export interface Progress {
  done: number;
  total: number;
  pct: number;
  missing: { section: string; sectionKey: string; label: string; blockKey: string }[];
}

export function surveyProgress(values: Values): Progress {
  let done = 0;
  let total = 0;
  const missing: Progress["missing"] = [];
  for (const sec of schema.sections) {
    if (isSkipped(values, sec.key)) continue;
    for (const b of sec.blocks) {
      if (!isRequired(b)) continue;
      const key = (b as { key: string; label: string }).key;
      total++;
      if (isAnswered(b, values[key])) done++;
      else missing.push({ section: sec.title, sectionKey: sec.key, label: (b as { label: string }).label, blockKey: key });
    }
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 100, missing };
}

// ───────────── File references ─────────────

/** Walk values and collect every FileRef (photos and attachments). */
export function collectFileRefs(values: unknown, out: FileRef[] = []): FileRef[] {
  if (Array.isArray(values)) {
    for (const x of values) collectFileRefs(x, out);
  } else if (values && typeof values === "object") {
    const o = values as Record<string, unknown>;
    if (o.kind === "file" && typeof o.id === "string") out.push(o as unknown as FileRef);
    else for (const x of Object.values(o)) collectFileRefs(x, out);
  }
  return out;
}

export function blockKey(b: BlockDef): string | null {
  return "key" in b ? b.key : null;
}
