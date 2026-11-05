// ───────────── Survey schema (generated into src/data/survey-schema.json) ─────────────

export interface SurveySchema {
  title: string;
  subtitle: string;
  sections: SectionDef[];
}

export interface SectionDef {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  tone: string;
  blocks: BlockDef[];
}

export type BlockDef =
  | { t: "heading"; text: string }
  | { t: "text" | "textarea" | "number"; key: string; label: string; placeholder?: string; required?: boolean }
  | { t: "date"; key: string; label: string; required?: boolean; defaultToday?: boolean }
  | { t: "select"; key: string; label: string; options: string[]; required?: boolean }
  | { t: "choice"; key: string; label: string; options: string[]; multi: boolean; required?: boolean }
  | { t: "check"; key: string; label: string; options: string[] }
  | { t: "routes"; key: string; placeholders: string[][] }
  | { t: "accessories"; key: string; rows: { key: string; label: string; options: { value: string; label: string }[] }[] }
  | { t: "qtyList"; key: string; items: { key: string; label: string }[] }
  | { t: "choiceQty"; key: string; label: string; yn: boolean; qty: boolean }
  | { t: "photos"; key: string; slots: { key: string; label: string }[] }
  | { t: "upload"; key: string; label: string; typeOptions: string[] }
  | { t: "dataPoints"; key: string; groups: { group: string; color: string; items: string[] }[] }
  | { t: "materials"; key: string; defaults: string[] }
  | { t: "manpower"; key: string; roles: string[] }
  | { t: "cameraSets"; key: string };

export type BlockType = BlockDef["t"];

// ───────────── Survey values ─────────────

/** Reference to a binary stored in IndexedDB locally and GridFS on the server. */
export interface FileRef {
  kind: "file";
  id: string;
  name: string;
  type: string;
  size: number;
  takenAt: number;
}

export interface RouteRow { from: string; to: string; distance: string }
export interface MaterialRow { id: string; name: string; qty: string; done: boolean }
export interface ManpowerRow { id: string; name: string; role: string; designation: string; headcount: string; days: string; hoursPerDay: string }
export interface CameraSet {
  id: string;
  type: string[];
  brand: string[];
  resolution: string[];
  night: string[];
  audio: string[];
  ai: string[];
  qty: string;
}
export interface UploadValue { types: string[]; files: FileRef[] }
export interface ChoiceQtyValue { yn?: string; qty?: string }

export type Values = Record<string, unknown>;

export type SurveyStatus = "draft" | "submitted";

// ───────────── Users / API shapes ─────────────

export type Role = "engineer" | "admin";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface SurveySummary {
  id: string;
  title: string;
  status: SurveyStatus;
  rev: number;
  updatedAt: number;
  ownerName: string;
}

export interface ServerSurvey {
  id: string;
  ownerId: string;
  ownerName: string;
  status: SurveyStatus;
  values: Values;
  rev: number;
  createdAt: number;
  updatedAt: number;
  submittedAt?: number;
}
