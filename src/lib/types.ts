// ───────────── Form definition ─────────────
// The ELV checklist is generated into src/data/survey-schema.json and seeded as the ELV form.
// Every department's forms use this same shape and live in MongoDB (edited in the form builder).

/** Fields the app uses for list titles and the "new survey" sheet. All optional. */
export interface FormMeta {
  /** Reference / deal / ticket number. */
  refKey?: string;
  /** Client or company name (second half of the title). */
  clientKey?: string;
  /** Site address or location (list subtitle). */
  siteKey?: string;
  /** Filled with the signed-in user's name when a survey starts. */
  engineerKey?: string;
  /** Survey date (list subtitle). */
  dateKey?: string;
}

/** always = cannot be left out · default = optional, on at start · optional = optional, off at start. */
export type SectionScope = "always" | "default" | "optional";

export interface FormSchema {
  title: string;
  subtitle: string;
  sections: SectionDef[];
  meta: FormMeta;
}
/** @deprecated use FormSchema */
export type SurveySchema = FormSchema;

export interface SectionDef {
  key: string;
  title: string;
  subtitle: string;
  /** Legacy emoji from the HTML source; the UI uses `iconName`. */
  icon?: string;
  /** Name from the app's icon set. */
  iconName?: string;
  tone: string;
  /** Short label for step chips. */
  short?: string;
  /** Defaults to "always". */
  scope?: SectionScope;
  /** Supporting section (materials, manpower): not counted as a surveyed "system". */
  support?: boolean;
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

/** Account-wide role. Everything else comes from department membership. */
export type Role = "super_admin" | "user";
export type DeptRole = "lead" | "member";

export interface Membership {
  departmentId: string;
  role: DeptRole;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  memberships: Membership[];
}

/** A department as the signed-in user may see it. */
export interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
  description: string;
  tone: string;
  iconName: string;
  createdAt: number;
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  memberCount: number;
  /** Only sent to people who manage the department (its lead, super admins). */
  members?: TeamMember[];
  /** Survey totals for the whole department. */
  stats: { total: number; draft: number; submitted: number; lastActivity?: number };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: DeptRole;
  joinedAt?: number;
}

export type FormStatus = "active" | "archived";

export interface FormInfo {
  id: string;
  departmentId: string;
  name: string;
  description: string;
  status: FormStatus;
  version: number;
  updatedAt: number;
  schema: FormSchema;
}

export interface Catalog {
  departments: DepartmentInfo[];
  forms: FormInfo[];
  fetchedAt: number;
}

export interface SurveySummary {
  id: string;
  title: string;
  status: SurveyStatus;
  rev: number;
  updatedAt: number;
  ownerName: string;
  departmentId: string;
  formId: string;
}

export interface ServerSurvey {
  id: string;
  ownerId: string;
  ownerName: string;
  departmentId: string;
  formId: string;
  status: SurveyStatus;
  values: Values;
  rev: number;
  createdAt: number;
  updatedAt: number;
  submittedAt?: number;
}
