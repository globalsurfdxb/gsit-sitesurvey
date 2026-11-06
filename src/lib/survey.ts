import { ELV_FORM, ELV_FORM_ID } from "./elv-form";
import type { BlockDef, CameraSet, FileRef, FormSchema, SectionDef, SessionUser, UploadValue, Values } from "./types";

export const SKIPPED_KEY = "_skipped";

// ───────────── Forms ─────────────
// Every function below takes the form (department-specific, loaded from the catalog) explicitly.

/**
 * Find a survey's form among the known ones. Surveys from before departments existed (no formId)
 * and the built-in ELV form fall back to the bundled copy, so they open even before the catalog loads.
 */
export function resolveForm(forms: ReadonlyMap<string, FormSchema>, formId: string | undefined): FormSchema | undefined {
  const id = formId || ELV_FORM_ID;
  return forms.get(id) ?? (id === ELV_FORM_ID ? ELV_FORM : undefined);
}

/** Name of a section's icon (validated at render time by asIconName). */
/** Look a field up by its key (labels and placeholders for the new-survey sheet). */
export function findBlock(form: FormSchema, key: string | undefined): BlockDef | undefined {
  if (!key) return undefined;
  for (const s of form.sections) for (const b of s.blocks) if ("key" in b && b.key === key) return b;
  return undefined;
}

export const sectionIcon =(s: SectionDef): string => s.iconName ?? "clipboard";
export const shortOf = (s: SectionDef) => s.short?.trim() || s.title.split(/\s+/).slice(0, 2).join(" ");

// ───────────── Scope: which sections apply to a given site ─────────────

/** Sections the engineer can choose to include or leave out. */
export const optionalSections = (form: FormSchema) => form.sections.filter((s) => (s.scope ?? "always") !== "always");

/** Optional sections that start switched on. */
export const defaultScope = (form: FormSchema) => form.sections.filter((s) => s.scope === "default").map((s) => s.key);

/** Optional sections that count as surveyed "systems" (not supporting sections like materials). */
export const systemSections = (form: FormSchema) => optionalSections(form).filter((s) => !s.support);

/** Sections that are in scope, in survey order. */
export function sectionsInScope(form: FormSchema, values: Values): SectionDef[] {
  return form.sections.filter((s) => !isSkipped(values, s.key));
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const at = (values: Values, key?: string) => (key ? str(values[key]) : "");

export function surveyTitle(form: FormSchema | undefined, values: Values): string {
  const ref = at(values, form?.meta.refKey);
  const client = at(values, form?.meta.clientKey);
  if (ref && client) return `${ref} — ${client}`;
  return ref || client || "Untitled survey";
}

export function surveySubtitle(form: FormSchema | undefined, values: Values): string {
  return [at(values, form?.meta.siteKey), at(values, form?.meta.dateKey)].filter(Boolean).join(" · ");
}

// ───────────── Initial values ─────────────

export const DEFAULT_CAMERA_BRAND = "Hikvision";

export function newCameraSet(): CameraSet {
  return { id: uid(), type: [], brand: [DEFAULT_CAMERA_BRAND], resolution: [], night: [], audio: [], ai: [], qty: "" };
}

export interface NewSurveyInit {
  ref?: string;
  client?: string;
  site?: string;
  /** Optional sections to include. Omit to include every section that starts switched on. */
  scope?: string[];
}

export function createInitialValues(form: FormSchema, user?: Pick<SessionUser, "name">, init: NewSurveyInit = {}): Values {
  const v: Values = {};
  for (const sec of form.sections) {
    for (const b of sec.blocks) {
      if (b.t === "date" && b.defaultToday) v[b.key] = todayISO();
      if (b.t === "materials") v[b.key] = b.defaults.map((name) => ({ id: uid(), name, qty: "1", done: false }));
      if (b.t === "cameraSets") v[b.key] = [newCameraSet()];
      if (b.t === "routes") v[b.key] = b.placeholders.map(() => ({ from: "", to: "", distance: "" }));
      if (b.t === "manpower") v[b.key] = [];
    }
  }
  const { refKey, clientKey, siteKey, engineerKey } = form.meta;
  if (user?.name && engineerKey) v[engineerKey] = user.name;
  if (init.ref?.trim() && refKey) v[refKey] = init.ref.trim();
  if (init.client?.trim() && clientKey) v[clientKey] = init.client.trim();
  if (init.site?.trim() && siteKey) v[siteKey] = init.site.trim();
  const scope = init.scope ?? defaultScope(form);
  v[SKIPPED_KEY] = optionalSections(form).filter((s) => !scope.includes(s.key)).map((s) => s.key);
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

const NO_PROGRESS: Progress = { done: 0, total: 0, pct: 0, missing: [] };

export function surveyProgress(form: FormSchema | undefined, values: Values): Progress {
  if (!form) return NO_PROGRESS;
  let done = 0;
  let total = 0;
  const missing: Progress["missing"] = [];
  for (const sec of form.sections) {
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
