import { collectFileRefs } from "./survey";
import {
  emitChange,
  getFile,
  listAllSurveys,
  markFileUploaded,
  patchSurvey,
  removeSurveyLocal,
  replaceSurvey,
  getSurvey,
} from "./local-db";
import type { ServerSurvey, SessionUser, SurveySummary } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super(String(body.error ?? `HTTP ${status}`));
  }
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin", ...init, headers: { ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export interface SyncResult {
  ok: boolean;
  /** Session expired: keep working offline, ask the user to sign in again. */
  auth?: boolean;
  offline?: boolean;
  pushed: number;
  pulled: number;
  error?: string;
}

let inflight: Promise<SyncResult> | null = null;

/** Push local changes, then pull remote ones. Concurrent calls share one run. */
export function syncNow(user: SessionUser): Promise<SyncResult> {
  return (inflight ??= run(user).finally(() => {
    inflight = null;
  }));
}

async function run(user: SessionUser): Promise<SyncResult> {
  const result: SyncResult = { ok: true, pushed: 0, pulled: 0 };
  try {
    const mine = (await listAllSurveys()).filter((s) => s.ownerId === user.id || user.role === "admin");

    // 1. Deletions made while offline.
    for (const s of mine.filter((s) => s.deleted)) {
      if (s.rev > 0) await api(`/api/surveys/${s.id}`, { method: "DELETE" });
      await removeSurveyLocal(s.id);
    }

    // 2. Push edits (skip ones already in conflict until the user resolves them).
    for (const s of mine.filter((s) => s.dirty && !s.deleted && !s.conflict)) {
      if (await pushSurvey(s.id, false)) result.pushed++;
    }

    // 3. Pull what changed elsewhere.
    const { surveys: remote } = await api<{ surveys: SurveySummary[] }>("/api/surveys");
    const remoteIds = new Set(remote.map((r) => r.id));
    for (const r of remote) {
      const local = await getSurvey(r.id);
      if (!local || (!local.dirty && !local.deleted && r.rev > local.rev)) {
        const { survey } = await api<{ survey: ServerSurvey }>(`/api/surveys/${r.id}`);
        await replaceSurvey(fromServer(survey));
        result.pulled++;
      }
    }
    // Deleted on another device and nothing unsynced here -> drop our copy.
    for (const s of (await listAllSurveys()).filter((s) => s.rev > 0 && !s.dirty && !s.deleted && !remoteIds.has(s.id))) {
      await removeSurveyLocal(s.id);
    }
  } catch (e) {
    return fail(result, e);
  }
  emitChange();
  return result;
}

function fail(result: SyncResult, e: unknown): SyncResult {
  emitChange();
  if (e instanceof ApiError && e.status === 401) return { ...result, ok: false, auth: true };
  if (e instanceof TypeError) return { ...result, ok: false, offline: true }; // fetch rejects when the network is down
  return { ...result, ok: false, error: e instanceof Error ? e.message : String(e) };
}

export function fromServer(s: ServerSurvey) {
  return {
    id: s.id,
    ownerId: s.ownerId,
    ownerName: s.ownerName,
    values: s.values,
    status: s.status,
    rev: s.rev,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    dirty: false,
  };
}

/**
 * PUT one survey, then upload the files it references.
 * Returns true if the survey is now in sync. A 409 marks it as conflicted.
 */
export async function pushSurvey(id: string, force: boolean): Promise<boolean> {
  const s = await getSurvey(id);
  if (!s) return false;
  const sentAt = s.updatedAt;
  try {
    const r = await api<{ rev: number }>(`/api/surveys/${id}`, {
      method: "PUT",
      body: JSON.stringify({ values: s.values, status: s.status, baseRev: s.rev, createdAt: s.createdAt, updatedAt: s.updatedAt, force }),
    });
    // The user may have kept typing while we were uploading; only clear `dirty` if nothing changed.
    await patchSurvey(id, (cur) => {
      cur.rev = r.rev;
      cur.conflict = undefined;
      if (cur.updatedAt === sentAt) cur.dirty = false;
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const server = e.body.server as ServerSurvey | undefined;
      await patchSurvey(id, (cur) => {
        cur.conflict = { serverRev: server?.rev ?? 0 };
      });
      return false;
    }
    throw e;
  }
  await uploadFiles(id, collectFileRefs(s.values).map((f) => f.id));
  return true;
}

async function uploadFiles(surveyId: string, ids: string[]) {
  for (const id of ids) {
    const f = await getFile(id);
    if (!f || f.uploaded) continue;
    const form = new FormData();
    form.set("id", f.id);
    form.set("surveyId", surveyId);
    form.set("file", new File([f.blob], f.name, { type: f.type }));
    try {
      await api("/api/files", { method: "POST", body: form });
      await markFileUploaded(f.id);
    } catch (e) {
      // Files the server refuses permanently shouldn't block the rest of the sync forever.
      if (e instanceof ApiError && [400, 413, 415].includes(e.status)) {
        console.warn("[sync] file rejected by server", f.name, e.message);
        await markFileUploaded(f.id);
        continue;
      }
      throw e;
    }
  }
}

/** Conflict resolution: take the server's copy, discarding local edits. */
export async function resolveUseServer(id: string) {
  const { survey } = await api<{ survey: ServerSurvey }>(`/api/surveys/${id}`);
  await replaceSurvey(fromServer(survey));
}

/** Conflict resolution: overwrite the server with this device's copy. */
export async function resolveKeepMine(id: string) {
  const s = await getSurvey(id);
  if (!s?.conflict) return;
  await patchSurvey(id, (cur) => {
    cur.rev = cur.conflict?.serverRev ?? cur.rev;
  });
  await pushSurvey(id, true);
}
