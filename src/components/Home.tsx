"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSurvey, listSurveys, onLocalChange, patchSurvey, removeSurveyLocal, type LocalSurvey } from "@/lib/local-db";
import { createInitialValues, surveyProgress, surveySubtitle, surveyTitle, uid } from "@/lib/survey";
import { useApp } from "./AppProvider";
import { ProgressRing } from "./ui";

type Filter = "all" | "draft" | "submitted";

const fmt = (t: number) => new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function Home() {
  const router = useRouter();
  const { user, ready, requestSync, status, lastSync, online } = useApp();
  // A freshly signed-in device has nothing local until the first pull finishes.
  const firstPullPending = lastSync === null && online && (status === "idle" || status === "syncing");
  const [all, setAll] = useState<LocalSurvey[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let live = true;
    const load = () => listSurveys().then((s) => live && setAll(s));
    load();
    const off = onLocalChange(load);
    return () => {
      live = false;
      off();
    };
  }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (all ?? [])
      .filter((s) => !user || s.ownerId === user.id || user.role === "admin")
      .filter((s) => filter === "all" || s.status === filter)
      .filter((s) => !needle || `${surveyTitle(s.values)} ${surveySubtitle(s.values)}`.toLowerCase().includes(needle))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [all, q, filter, user]);

  async function create() {
    if (!user) return;
    const now = Date.now();
    const id = uid();
    await createSurvey({ id, ownerId: user.id, ownerName: user.name, values: createInitialValues(user), status: "draft", rev: 0, createdAt: now, updatedAt: now, dirty: true });
    requestSync();
    router.push(`/survey?id=${id}`);
  }

  async function remove(s: LocalSurvey) {
    if (!confirm(`Delete "${surveyTitle(s.values)}"?\n\nThis also removes it from the server once you're online.`)) return;
    if (s.rev === 0) await removeSurveyLocal(s.id); // never reached the server
    else {
      await patchSurvey(s.id, (x) => {
        x.deleted = true;
      });
      requestSync(true);
    }
  }

  return (
    <>
      <div className="home-head">
        <h1>Surveys</h1>
        <button className="btn primary" onClick={create} disabled={!user}>
          + New survey
        </button>
      </div>

      <div className="toolbar">
        <input className="input" type="search" placeholder="Search deal, client or site…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search surveys" />
        <div className="seg">
          {(["all", "draft", "submitted"] as const).map((f) => (
            <button key={f} className={`seg-btn${filter === f ? " on neutral" : ""}`} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {!ready || all === null || (rows.length === 0 && all.length === 0 && firstPullPending) ? (
        <div className="center muted">{firstPullPending ? "Loading your surveys…" : "Loading…"}</div>
      ) : rows.length === 0 ? (
        <div className="empty card">
          <p>{all.length === 0 ? "No surveys yet." : "No surveys match."}</p>
          {all.length === 0 && <p className="muted small">Tap “New survey” to start capturing. Everything is saved on this device first, so it works without signal.</p>}
        </div>
      ) : (
        <ul className="list">
          {rows.map((s) => {
            const p = surveyProgress(s.values);
            return (
              <li key={s.id} className="card survey-item">
                <Link href={`/survey?id=${s.id}`} className="survey-link">
                  <ProgressRing pct={p.pct} label={`${p.done}/${p.total} required`} />
                  <span className="survey-main">
                    <strong>{surveyTitle(s.values)}</strong>
                    <small className="muted">{surveySubtitle(s.values) || "No site address yet"}</small>
                    <small className="muted">
                      Updated {fmt(s.updatedAt)}
                      {user?.role === "admin" && s.ownerName ? ` · ${s.ownerName}` : ""}
                    </small>
                  </span>
                </Link>
                <span className="survey-tags">
                  <span className={`tag ${s.status}`}>{s.status}</span>
                  {s.conflict ? <span className="tag bad">conflict</span> : s.dirty ? <span className="tag warn">not synced</span> : <span className="tag ok">synced</span>}
                </span>
                <button className="icon-btn" onClick={() => remove(s)} aria-label={`Delete ${surveyTitle(s.values)}`}>
                  🗑
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
