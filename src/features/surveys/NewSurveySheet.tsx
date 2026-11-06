"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { SectionIcon } from "@/features/editor/SectionIcon";
import { useCatalog } from "@/features/catalog/useCatalog";
import { canCreateIn, isManager } from "@/lib/access";
import { ELV_DEPARTMENT_ID, ELV_FORM, ELV_FORM_ID } from "@/lib/elv-form";
import { createSurvey } from "@/lib/local-db";
import { createInitialValues, defaultScope, findBlock, optionalSections, systemSections, uid } from "@/lib/survey";
import type { FormSchema, SessionUser } from "@/lib/types";

const FORM_ID = "new-survey-form";

export interface NewSurveyPreset {
  departmentId?: string;
  formId?: string;
}

interface Choice {
  id: string;
  departmentId: string;
  name: string;
  schema: FormSchema;
}

/** Save a new draft on this device (it syncs later) and return its id. */
async function startSurvey(user: SessionUser, choice: Choice, init: { ref: string; client: string; site: string; scope: string[] }): Promise<string> {
  const now = Date.now();
  const id = uid();
  await createSurvey({
    id,
    ownerId: user.id,
    ownerName: user.name,
    departmentId: choice.departmentId,
    formId: choice.id,
    values: createInitialValues(choice.schema, user, init),
    status: "draft",
    rev: 0,
    createdAt: now,
    updatedAt: now,
    dirty: true,
  });
  return id;
}

function fieldOf(form: FormSchema, key: string | undefined, fallbackLabel: string) {
  const b = findBlock(form, key);
  return { label: b && "label" in b ? b.label : fallbackLabel, placeholder: b && "placeholder" in b ? (b.placeholder ?? "") : "" };
}

function Form({ onDone, preset }: { onDone: () => void; preset?: NewSurveyPreset }) {
  const router = useRouter();
  const { user, requestSync } = useApp();
  const catalog = useCatalog();

  // Forms this person may start a survey with: active forms of departments they belong to (super admins: all).
  const choices = useMemo<Choice[]>(() => {
    if (!user) return [];
    const list: Choice[] = catalog.forms
      .filter((f) => f.status === "active" && canCreateIn(user, f.departmentId))
      .map((f) => ({ id: f.id, departmentId: f.departmentId, name: f.name, schema: f.schema }));
    // Until the first sync has delivered the catalog, ELV people can still use the bundled checklist.
    if (catalog.loaded && !catalog.forms.some((f) => f.id === ELV_FORM_ID) && canCreateIn(user, ELV_DEPARTMENT_ID) && catalog.forms.length === 0) {
      list.push({ id: ELV_FORM_ID, departmentId: ELV_DEPARTMENT_ID, name: ELV_FORM.title, schema: ELV_FORM });
    }
    return list;
  }, [catalog, user]);

  const departments = useMemo(() => [...new Set(choices.map((c) => c.departmentId))], [choices]);
  const [pick, setPick] = useState<{ departmentId?: string; formId?: string }>({ departmentId: preset?.departmentId, formId: preset?.formId });
  const departmentId = departments.includes(pick.departmentId ?? "") ? pick.departmentId! : (choices.find((c) => c.id === preset?.formId)?.departmentId ?? departments[0]);
  const inDept = choices.filter((c) => c.departmentId === departmentId);
  const chosen = inDept.find((c) => c.id === pick.formId) ?? inDept.find((c) => c.id === preset?.formId) ?? inDept[0];
  const form = chosen?.schema;

  const [text, setText] = useState({ ref: "", client: "", site: "" });
  const [scopeState, setScopeState] = useState<{ formId: string; keys: string[] } | null>(null);
  const [error, setError] = useState("");

  if (!user || !catalog.loaded) return <p className="muted">Loading…</p>;

  if (!chosen || !form) {
    return (
      <div className="empty-state">
        <Icon name="layers" size={28} />
        <strong>No survey form available yet</strong>
        <span className="muted small">
          {isManager(user) ? "Create a form for your department first." : "Your team lead (or an administrator) hasn’t published a form for your department yet."}
        </span>
        {isManager(user) && (
          <Link href="/forms" className="btn primary sm" onClick={onDone}>
            Go to forms
          </Link>
        )}
      </div>
    );
  }

  const scope = scopeState?.formId === chosen.id ? scopeState.keys : defaultScope(form);
  const toggle = (k: string) => setScopeState({ formId: chosen.id, keys: scope.includes(k) ? scope.filter((x) => x !== k) : [...scope, k] });
  const ref = fieldOf(form, form.meta.refKey, "Reference");
  const client = fieldOf(form, form.meta.clientKey, "Client");
  const site = fieldOf(form, form.meta.siteKey, "Site");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form || !chosen) return;
    const systems = systemSections(form);
    if (systems.length && !systems.some((s) => scope.includes(s.key))) return setError("Pick at least one section to survey.");
    const id = await startSurvey(user, chosen, { ...text, scope });
    requestSync();
    onDone();
    router.push(`/survey?id=${id}`);
  }

  const optional = optionalSections(form);

  return (
    <form id={FORM_ID} onSubmit={submit} className="stack">
      {(departments.length > 1 || inDept.length > 1) && (
        <div className={departments.length > 1 && inDept.length > 1 ? "grid2" : ""}>
          {departments.length > 1 && (
            <label className="field">
              <span className="field-label">Department</span>
              <select className="input" value={departmentId} onChange={(e) => setPick({ departmentId: e.target.value })}>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {catalog.department(d)?.name ?? d}
                  </option>
                ))}
              </select>
            </label>
          )}
          {inDept.length > 1 && (
            <label className="field">
              <span className="field-label">Form</span>
              <select className="input" value={chosen.id} onChange={(e) => setPick({ departmentId, formId: e.target.value })}>
                {inDept.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {departments.length === 1 && inDept.length === 1 && (
        <p className="muted small">
          {catalog.department(departmentId)?.name ?? departmentId} · {chosen.name}
        </p>
      )}

      {form.meta.refKey && (
        <label className="field">
          <span className="field-label">{ref.label} <span className="req">*</span></span>
          <input className="input" required value={text.ref} onChange={(e) => setText({ ...text, ref: e.target.value })} placeholder={ref.placeholder} autoFocus autoCapitalize="characters" />
        </label>
      )}
      {form.meta.clientKey && (
        <label className="field">
          <span className="field-label">{client.label} <span className="req">*</span></span>
          <input className="input" required value={text.client} onChange={(e) => setText({ ...text, client: e.target.value })} placeholder={client.placeholder || "e.g. Acme Trading LLC"} />
        </label>
      )}
      {form.meta.siteKey && (
        <label className="field">
          <span className="field-label">{site.label}</span>
          <input className="input" value={text.site} onChange={(e) => setText({ ...text, site: e.target.value })} placeholder={site.placeholder || "Building, floor, area, emirate"} />
        </label>
      )}

      {optional.length > 0 && (
        <div className="field">
          <span className="field-label">What are you surveying?</span>
          <div className="scope-grid">
            {optional.map((s) => {
              const on = scope.includes(s.key);
              return (
                <button type="button" key={s.key} className={`scope-chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggle(s.key)}>
                  <SectionIcon section={s} size={18} />
                  <span>{s.short ?? s.title.replace(/ \/ .*/, "")}</span>
                  {on && <Icon name="check" size={16} className="scope-tick" />}
                </button>
              );
            })}
          </div>
          <p className="hint">You can change this later from inside the survey.</p>
        </div>
      )}
      {error && <div className="error" role="alert">{error}</div>}
    </form>
  );
}

export function NewSurveySheet({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: NewSurveyPreset }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New survey"
      footer={
        <button className="btn primary block" type="submit" form={FORM_ID}>
          Start survey
        </button>
      }
    >
      {open && <Form onDone={onClose} preset={preset} />}
    </Sheet>
  );
}
