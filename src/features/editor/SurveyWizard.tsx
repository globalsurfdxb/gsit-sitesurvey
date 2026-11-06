"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useUi } from "@/components/ui/UiProvider";
import { useCatalog } from "@/features/catalog/useCatalog";
import { canEditSurvey } from "@/lib/access";
import { getSurvey, onLocalChange, patchSurvey, type LocalSurvey } from "@/lib/local-db";
import { SKIPPED_KEY, sectionStats, sectionsInScope, shortOf, surveyProgress, surveyTitle } from "@/lib/survey";
import { resolveKeepMine, resolveUseServer } from "@/lib/sync";
import type { Values } from "@/lib/types";
import { BlockRenderer } from "./BlockRenderer";
import { groupBlocks } from "./groups";
import { ReviewStep } from "./ReviewStep";
import { ScopeSheet } from "./ScopeSheet";
import { SectionIcon } from "./SectionIcon";

const REVIEW = "review";

const stepKeyStore = (id: string) => `gs_step_${id}`;

export function SurveyWizard() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { user, requestSync, status, online } = useApp();
  const catalog = useCatalog();
  const { confirm, toast } = useUi();

  const [rec, setRec] = useState<LocalSurvey | null | undefined>(undefined); // undefined = loading, null = not found
  const [values, setValues] = useState<Values>({});
  const [stepKey, setStepKey] = useState<string | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
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
      if (first) {
        try {
          setStepKey(localStorage.getItem(stepKeyStore(id)));
        } catch {
          /* resume position is a nicety */
        }
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

  const form = catalog.formFor(rec?.formId);
  const sections = useMemo(() => (form ? sectionsInScope(form, values) : []), [form, values]);
  const steps = useMemo(() => [...sections.map((s) => s.key), REVIEW], [sections]);
  const current = stepKey && steps.includes(stepKey) ? stepKey : steps[0];
  const index = steps.indexOf(current);
  const section = sections.find((s) => s.key === current);

  const go = useCallback(
    (key: string) => {
      setStepKey(key);
      if (id) {
        try {
          localStorage.setItem(stepKeyStore(id), key);
        } catch {
          /* ignore */
        }
      }
    },
    [id],
  );

  // New step → start at the top, and keep its chip in view.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector(`[data-step="${current}"]`)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [current]);

  if (id && (rec === undefined || (rec && !form && !catalog.loaded))) return <div className="center muted">Loading survey…</div>;
  if (!rec || !id)
    return (
      <div className="center">
        <p>This survey isn’t on this device.</p>
        <Link href="/surveys" className="btn primary">
          Back to surveys
        </Link>
      </div>
    );

  if (!form)
    return (
      <div className="center">
        <p>This survey’s form isn’t on this device yet.</p>
        <p className="muted small">Connect to the internet once so the app can download it.</p>
        <Link href="/surveys" className="btn primary">
          Back to surveys
        </Link>
      </div>
    );

  const readOnly = !!user && !canEditSurvey(user, rec);
  const progress = surveyProgress(form, values);
  const skipped = (Array.isArray(values[SKIPPED_KEY]) ? values[SKIPPED_KEY] : []) as string[];
  const toggleScope = (key: string) => onChange(SKIPPED_KEY, skipped.includes(key) ? skipped.filter((k) => k !== key) : [...skipped, key]);
  const submitted = rec.status === "submitted";
  const nextKey = steps[index + 1];
  const nextSection = sections.find((x) => x.key === nextKey);
  const nextLabel = nextKey === REVIEW ? "Review" : nextSection ? shortOf(nextSection) : "";

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
    const { missing } = surveyProgress(form!, valuesRef.current);
    if (missing.length) {
      const list = missing.slice(0, 5).map((m) => `• ${m.section}: ${m.label}`).join("\n");
      const more = missing.length > 5 ? `\n…and ${missing.length - 5} more` : "";
      const ok = await confirm({
        title: `${missing.length} required field${missing.length === 1 ? " is" : "s are"} empty`,
        message: `${list}${more}\n\nYou can still submit and finish later.`,
        confirmLabel: "Submit anyway",
      });
      if (!ok) return;
    }
    await setStatus("submitted");
    toast("Survey submitted", "success");
    router.push("/surveys");
  }

  return (
    <div className="wizard">
      <header className="wiz-head">
        <div className="wiz-top">
          <Link href="/surveys" className="icon-btn" aria-label="Back to surveys" onClick={() => flush()}>
            <Icon name="arrow-left" />
          </Link>
          <div className="wiz-title">
            <strong>{surveyTitle(form, values)}</strong>
            <span className="muted small ellipsis">
              Step {index + 1} of {steps.length} · {current === REVIEW ? "Review" : section?.title}
            </span>
          </div>
          {!readOnly && (
            <button className="icon-btn" onClick={() => setScopeOpen(true)} aria-label="Change survey scope" title="Survey scope">
              <Icon name="sliders" />
            </button>
          )}
          <ProgressRing pct={progress.pct} size={38} label={`${progress.done}/${progress.total} required`} />
        </div>
        <nav className="steps" aria-label="Survey steps">
          {sections.map((s) => {
            const st = sectionStats(s, values);
            const complete = st.requiredTotal > 0 ? st.requiredDone === st.requiredTotal : st.answered > 0;
            return (
              <button key={s.key} data-step={s.key} className={`step-chip${current === s.key ? " active" : ""}${complete ? " complete" : ""}`} aria-current={current === s.key ? "step" : undefined} onClick={() => go(s.key)}>
                {complete && current !== s.key ? <Icon name="check" size={14} /> : <SectionIcon section={s} size={14} />}
                {shortOf(s)}
              </button>
            );
          })}
          <button data-step={REVIEW} className={`step-chip${current === REVIEW ? " active" : ""}`} onClick={() => go(REVIEW)}>
            <Icon name="check-circle" size={14} /> Review
          </button>
        </nav>
        <div className="track" aria-hidden>
          <i style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
      </header>

      <div className="wiz-body">
        {readOnly && (
          <div className="banner info" role="status">
            <Icon name="eye" size={20} />
            <div>
              <strong>Read-only</strong>
              <p>This survey belongs to {rec.ownerName ?? "another member"}. You can review it and open the report, but only they can change it.</p>
            </div>
          </div>
        )}

        {rec.rejected && !readOnly && (
          <div className="banner warn" role="alert">
            <Icon name="alert" size={20} />
            <div>
              <strong>Not accepted by the server</strong>
              <p>{rec.rejected}. Your answers are safe on this device, but this survey won’t upload.</p>
            </div>
          </div>
        )}

        {rec.conflict && !readOnly && (
          <div className="banner warn" role="alert">
            <Icon name="alert" size={20} />
            <div>
              <strong>Sync conflict</strong>
              <p>This survey was changed on another device while you had unsynced edits.</p>
              <div className="banner-actions">
                <button className="btn amber sm" onClick={async () => { await flush(); await resolveKeepMine(id); toast("Your version was kept", "success"); }}>
                  Keep my version
                </button>
                <button
                  className="btn ghost sm"
                  onClick={async () => {
                    if (await confirm({ title: "Use the server version?", message: "Your unsynced edits on this device will be discarded.", confirmLabel: "Use server version", danger: true })) {
                      dirtyLocal.current = false;
                      await resolveUseServer(id);
                    }
                  }}
                >
                  Use server version
                </button>
              </div>
            </div>
          </div>
        )}

        {current === REVIEW ? (
          <ReviewStep id={id} form={form} values={values} status={rec.status} onGo={go} />
        ) : (
          section && (
            <>
              <div className="section-intro">
                <span className={`sec-icon lg tone-${section.tone}`}><SectionIcon section={section} size={24} /></span>
                <div>
                  <h1>{section.title}</h1>
                  <p className="muted small">{section.subtitle}</p>
                </div>
              </div>
              <fieldset className="plain-fieldset" disabled={readOnly}>
                {groupBlocks(section.blocks).map((g, gi) => (
                  <section className="group card" key={gi}>
                    {g.title && <h3 className="group-title">{g.title}</h3>}
                    {g.blocks.map((b, i) => (
                      <BlockRenderer key={"key" in b ? b.key : `b${gi}-${i}`} block={b} value={"key" in b ? values[b.key] : undefined} onChange={onChange} surveyId={id} />
                    ))}
                  </section>
                ))}
              </fieldset>
            </>
          )
        )}
      </div>

      <div className="wiz-bar">
        <div className="wiz-bar-inner">
          <span className="save-state small" aria-live="polite">
            {saved === "saving" ? "Saving…" : rec.dirty ? "Saved on device" : "Saved"}
            {!online && " · offline"}
            {status === "auth" && " · sign in again to sync"}
          </span>
          <div className="wiz-actions">
            <button className="btn ghost" onClick={() => go(steps[index - 1])} disabled={index === 0}>
              <Icon name="chevron-left" size={18} /> Back
            </button>
            {current !== REVIEW ? (
              <button className="btn primary" onClick={() => go(nextKey)}>
                Next<span className="next-hint">: {nextLabel}</span> <Icon name="chevron-right" size={18} />
              </button>
            ) : readOnly ? (
              <Link href={`/report?id=${id}`} className="btn primary">
                <Icon name="file" size={18} /> Report
              </Link>
            ) : submitted ? (
              <button className="btn secondary" onClick={() => setStatus("draft")}>Reopen</button>
            ) : (
              <button className="btn primary" onClick={submit}>
                <Icon name="check" size={18} /> Submit
              </button>
            )}
          </div>
        </div>
      </div>

      <ScopeSheet open={scopeOpen} onClose={() => setScopeOpen(false)} form={form} values={values} onToggle={toggleScope} />
    </div>
  );
}
