import type { Role, SessionUser } from "./types";

// Who may do what. Pure functions, used by the API (enforcement) and the UI (what to show).
//
//   super admin  — everything, in every department
//   team lead    — sees their department's members and surveys (read-only), edits its forms, manages its members
//   member       — creates and edits their own surveys using their department's forms

type Who = Pick<SessionUser, "role" | "memberships">;

/** Accounts created before departments used "admin" / "engineer". */
export const normalizeRole = (raw: unknown): Role => (raw === "super_admin" || raw === "admin" ? "super_admin" : "user");

export const isSuperAdmin = (u: Who) => u.role === "super_admin";
export const memberDepartments = (u: Who) => u.memberships.map((m) => m.departmentId);
export const ledDepartments = (u: Who) => u.memberships.filter((m) => m.role === "lead").map((m) => m.departmentId);
export const isLeadOf = (u: Who, departmentId: string | undefined) => !!departmentId && ledDepartments(u).includes(departmentId);
export const isManager = (u: Who) => isSuperAdmin(u) || ledDepartments(u).length > 0;

/** See a department's member list and manage its forms and members. */
export const canManageDepartment = (u: Who, departmentId: string) => isSuperAdmin(u) || isLeadOf(u, departmentId);
/** Create surveys with a department's forms. */
export const canCreateIn = (u: Who, departmentId: string) => isSuperAdmin(u) || memberDepartments(u).includes(departmentId);

interface SurveyRef {
  ownerId: string;
  departmentId?: string;
}
/** Read a survey (and its files): the owner, the department's lead, or a super admin. */
export const canViewSurvey = (u: Who & { id: string }, s: SurveyRef) => s.ownerId === u.id || isSuperAdmin(u) || isLeadOf(u, s.departmentId);
/** Change a survey: only the owner, or a super admin. Leads review but don't edit. */
export const canEditSurvey = (u: Who & { id: string }, s: SurveyRef) => s.ownerId === u.id || isSuperAdmin(u);

export const roleLabel = (u: Who): string => (isSuperAdmin(u) ? "Super admin" : ledDepartments(u).length ? "Team lead" : "Member");
