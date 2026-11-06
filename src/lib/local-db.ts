import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Catalog, SurveyStatus, Values } from "./types";

export interface LocalSurvey {
  id: string;
  ownerId: string;
  ownerName?: string;
  /** Absent on surveys saved before departments existed: treated as the ELV department and form. */
  departmentId?: string;
  formId?: string;
  values: Values;
  status: SurveyStatus;
  /** Last server revision this device has seen (0 = never synced). */
  rev: number;
  createdAt: number;
  updatedAt: number;
  /** Local changes not yet pushed. */
  dirty: boolean;
  /** Server has a newer version that conflicts with our unsynced edits. */
  conflict?: { serverRev: number };
  /** Tombstone: delete on the server at next sync, then drop locally. */
  deleted?: boolean;
  /** The server refused this survey for good (e.g. the author left the department). Not retried. */
  rejected?: string;
}

export interface LocalFile {
  id: string;
  surveyId: string;
  blob: Blob;
  name: string;
  type: string;
  size: number;
  /** 0 = still to upload, 1 = on the server. (IndexedDB can't index booleans.) */
  uploaded: 0 | 1;
}

interface Schema extends DBSchema {
  surveys: { key: string; value: LocalSurvey };
  /** Small cached documents, e.g. the departments + forms catalog. */
  meta: { key: string; value: unknown };
  files: { key: string; value: LocalFile; indexes: { bySurvey: string; byUploaded: number } };
}

let dbp: Promise<IDBPDatabase<Schema>> | null = null;
function db() {
  return (dbp ??= openDB<Schema>("gs-site-survey", 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore("surveys", { keyPath: "id" });
        const f = d.createObjectStore("files", { keyPath: "id" });
        f.createIndex("bySurvey", "surveyId");
        f.createIndex("byUploaded", "uploaded");
      }
      if (oldVersion < 2) d.createObjectStore("meta"); // v2: cached catalog
    },
  }));
}

// Lets pages re-read when a sync pulled something in.
const bus = typeof window !== "undefined" ? new EventTarget() : null;
export const emitChange = () => bus?.dispatchEvent(new Event("change"));
export function onLocalChange(cb: () => void) {
  bus?.addEventListener("change", cb);
  return () => bus?.removeEventListener("change", cb);
}

export async function listSurveys(): Promise<LocalSurvey[]> {
  return (await (await db()).getAll("surveys")).filter((s) => !s.deleted);
}
export async function listAllSurveys(): Promise<LocalSurvey[]> {
  return (await db()).getAll("surveys");
}
export async function getSurvey(id: string): Promise<LocalSurvey | undefined> {
  return (await db()).get("surveys", id);
}
export async function createSurvey(s: LocalSurvey) {
  await (await db()).add("surveys", s);
  emitChange();
}
export async function replaceSurvey(s: LocalSurvey) {
  await (await db()).put("surveys", s);
  emitChange();
}

/** The only way to modify an existing survey: an atomic read-modify-write. */
export async function patchSurvey(id: string, fn: (s: LocalSurvey) => void, opts: { silent?: boolean } = {}): Promise<LocalSurvey | undefined> {
  const d = await db();
  const tx = d.transaction("surveys", "readwrite");
  const cur = await tx.store.get(id);
  if (cur) {
    fn(cur);
    await tx.store.put(cur);
  }
  await tx.done;
  if (!opts.silent) emitChange();
  return cur;
}

export async function removeSurveyLocal(id: string) {
  const d = await db();
  const files = await d.getAllKeysFromIndex("files", "bySurvey", id);
  const tx = d.transaction(["surveys", "files"], "readwrite");
  await Promise.all([tx.objectStore("surveys").delete(id), ...files.map((k) => tx.objectStore("files").delete(k))]);
  await tx.done;
  emitChange();
}

// ── files ──
export async function putFile(f: LocalFile) {
  await (await db()).put("files", f);
}
export async function getFile(id: string): Promise<LocalFile | undefined> {
  return (await db()).get("files", id);
}
export async function deleteFile(id: string) {
  await (await db()).delete("files", id);
}
export async function markFileUploaded(id: string) {
  const d = await db();
  const tx = d.transaction("files", "readwrite");
  const f = await tx.store.get(id);
  if (f) await tx.store.put({ ...f, uploaded: 1 });
  await tx.done;
}
export async function countPendingFiles(): Promise<number> {
  return (await db()).countFromIndex("files", "byUploaded", 0);
}

// ── catalog (departments + forms) ──
export async function getCatalog(): Promise<Catalog | null> {
  return ((await (await db()).get("meta", "catalog")) as Catalog | undefined) ?? null;
}
export async function putCatalog(c: Catalog) {
  await (await db()).put("meta", c, "catalog");
  emitChange();
}
