"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSurvey, onLocalChange, patchSurvey, type LocalSurvey } from "@/lib/local-db";
import { isSkipped, schema, sectionStats, SKIPPED_KEY, surveyProgress, surveySubtitle, surveyTitle } from "@/lib/survey";
import { resolveKeepMine, resolveUseServer } from "@/lib/sync";
import type { Values } from "@/lib/types";
import { useApp } from "../AppProvider";
import { ProgressRing } from "../ui";
import { BlockRenderer } from "./BlockRenderer";

export function SurveyEditor() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { requestSync, status, online } = useApp();

  const [rec, setRec] = useState<LocalSurvey | null | undefined>(undefined); // undefined = loading, null = not found
  const [values, setValues] = useState<Values>({});
  const [openKey, setOpenKey] = useState<string | null>(schema.sections[0].key);
  const [saved, setSaved] = useState<"saved" | "saving">("saved");

  const valuesRef = useRef<Values>({});
  const lastWrite = useRef(0); // updatedAt of our most recent write; lets us spot changes made by sync
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dirtyLocal = useRef(false);

  // Initial load, and re-read when sync changes the record underneath us.
  useEffect(() => {
    if (!id) return;
    let live = true;
    const load = async (first: boolean) => {
      const s = await getSurvey(id);
      if (!live) return;
      if (!s || s.deleted) return setRec(null);
      setRec(s);
      // Adopt the stored values on first load, or when sync replaced them and we have no unsaved typing.
      if (first || (s.updatedAt !== lastWrite.current && !dirtyLocal.current)) {
        valuesRef.current = s.values;
        lastWrite.current = s.updatedAt;
        setValues(s.values);
      }
    };
    load(true);
    const off = onLocalChange(() => load(false));
    return () => {
      live = false;
      off();
    };
  }, [id]);

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current);
    if (!id || !dirtyLocal.current) return;
    const v = valuesRef.current;
    const t = Date.now();
    dirtyLocal.current = false;
    lastWrite.current = t;
    await patchSurvey(id, (s) => {
      s.values = v;
      s.updatedAt = t;
      s.dirty = true;
    });
    setSaved("saved");
    requestSync();
  }, [id, requestSync]);

  const onChange = useCallback(
    (key: string, value: unknown) => {
      const next = { ...valuesRef.current, [key]: value };
      valuesRef.current = next;
      dirtyLocal.current = true;
      setValues(next);
      setSaved("saving");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 500);
    },
    [flush],
  );

  // Never lose typing: flush when leaving the page or hiding the app.
  useEffect(() => {
    const hide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  if (id && rec === undefined) return <div className="center muted">Loading survey…</div>;
  if (!rec || !id)
    return (
      <div className="center">
        <p>This survey isn’t on this device.</p>
        <Link href="/" className="btn primary">
          Back to surveys
        </Link>
      </div>
    );

  const progress = surveyProgress(values);
  const skipped = (Array.isArray(values[SKIPPED_KEY]) ? values[SKIPPED_KEY] : []) as string[];
  const toggleSkip = (key: string) => onChange(SKIPPED_KEY, skipped.includes(key) ? skipped.filter((k) => k !== key) : [...skipped, key]);

  const goTo = (key: string) => {
    setOpenKey(key);
    requestAnimationFrame(() => document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  async function setStatus(next: "draft" | "submitted") {
    await flush();
    await patchSurvey(id!, (s) => {
      s.status = next;
      s.updatedAt = Date.now();
      s.dirty = true;
      lastWrite.current = s.updatedAt;
    });
    requestSync(true);
  }

  async function submit() {
    const { missing } = surveyProgress(valuesRef.current);
    if (missing.length) {
      const list = missing.slice(0, 6).map((m) => `• ${m.section}: ${m.label}`).join("\n");
      const more = missing.length > 6 ? `\n…and ${missing.length - 6} more` : "";
      if (!confirm(`${missing.length} required field${missing.length === 1 ? " is" : "s are"} empty:\n\n${list}${more}\n\nSubmit anyway?`)) return;
    }
    await setStatus("submitted");
    router.push("/");
  }

  const submitted = rec.status === "submitted";

  return (
    <>
      <div className="editor-head">
        <div className="editor-title">
          <h1>{surveyTitle(values)}</h1>
          <p className="muted small">{surveySubtitle(values) || "New survey"}</p>
        </div>
        <ProgressRing pct={progress.pct} label={`${progress.done}/${progress.total} required`} />
      </div>

      {rec.conflict && (
        <div className="banner warn" role="alert">
          <strong>Sync conflict.</strong> This survey was changed on another device while you had unsynced edits.
          <div className="banner-actions">
            <button className="btn amber sm" onClick={async () => { await flush(); await resolveKeepMine(id); }}>
              Keep my version
            </button>
            <button className="btn ghost sm" onClick={async () => { if (confirm("Discard your unsynced edits and load the server version?")) { dirtyLocal.current = false; await resolveUseServer(id); } }}>
              Use server version
            </button>
          </div>
        </div>
      )}

      <nav className="step-nav" aria-label="Survey sections">
        {schema.sections.map((s) => {
          const st = sectionStats(s, values);
          const complete = st.requiredTotal > 0 && st.requiredDone === st.requiredTotal;
          return (
            <button key={s.key} className={`step${openKey === s.key ? " active" : ""}${complete ? " complete" : ""}${skipped.includes(s.key) ? " skipped" : ""}`} onClick={() => goTo(s.key)}>
              {s.title.replace(/ \/ .*/, "").replace("Access control + biometric system", "AC + Biometric")}
            </button>
          );
        })}
      </nav>

      {schema.sections.map((sec) => {
        const st = sectionStats(sec, values);
        const open = openKey === sec.key;
        const na = isSkipped(values, sec.key);
        return (
          <section className={`card sec${open ? " open" : ""}${na ? " na" : ""}`} id={`sec-${sec.key}`} key={sec.key}>
            <button className="sec-head" aria-expanded={open} onClick={() => setOpenKey(open ? null : sec.key)}>
              <span className={`sec-icon tone-${sec.tone}`} aria-hidden>{sec.icon}</span>
              <span className="sec-meta">
                <strong>{sec.title}</strong>
                <small>{na ? "Marked not applicable" : sec.subtitle}</small>
              </span>
              <span className={`pill-count${st.requiredTotal > 0 && st.requiredDone === st.requiredTotal ? " done" : st.answered > 0 ? " partial" : ""}`}>
                {na ? "N/A" : sec.key === "material" || sec.key === "manpower" ? `${st.answered ? "✓" : "—"}` : `${st.answered} / ${st.total}`}
              </span>
              <span className="chev" aria-hidden>⌄</span>
            </button>
            {open && (
              <div className="sec-body">
                {sec.key !== "client" && sec.key !== "site" && (
                  <label className="na-toggle">
                    <input type="checkbox" checked={na} onChange={() => toggleSkip(sec.key)} /> Not applicable for this site
                  </label>
                )}
                {!na &&
                  sec.blocks.map((b, i) => (
                    <BlockRenderer key={"key" in b ? b.key : `h${i}`} block={b} value={"key" in b ? values[b.key] : undefined} onChange={onChange} surveyId={id} />
                  ))}
              </div>
            )}
          </section>
        );
      })}

      <div className="bottom-bar">
        <div className="save-state small" aria-live="polite">
          {saved === "saving" ? "Saving…" : rec.dirty ? "Saved on device" : "All changes synced"}
          {!online && " · offline"}
          {status === "auth" && " · sign in again to sync"}
        </div>
        <div className="bottom-actions">
          <Link className="btn ghost" href={`/report?id=${id}`}>
            Report
          </Link>
          {submitted ? (
            <button className="btn secondary" onClick={() => setStatus("draft")}>Reopen</button>
          ) : (
            <button className="btn primary" onClick={submit}>Submit survey</button>
          )}
        </div>
      </div>
    </>
  );
}
