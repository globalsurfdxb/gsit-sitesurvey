"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { IconTile } from "@/components/ui/Pickers";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useUi } from "@/components/ui/UiProvider";
import { useCatalog } from "@/features/catalog/useCatalog";
import { SurveyCard } from "@/features/surveys/SurveyCard";
import { useLocalSurveys, useSurveyActions } from "@/features/surveys/useSurveys";
import { isSuperAdmin, isLeadOf } from "@/lib/access";
import { surveyProgress, surveySubtitle, surveyTitle } from "@/lib/survey";
import { AdminDashboard } from "./AdminDashboard";
import { TeamPanel } from "./TeamPanel";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className={`stat ${tone ?? ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

/** Home: the company overview for super admins; for everyone else a personal dashboard (plus the team panel for leads). */
export function Dashboard() {
  const { user } = useApp();
  if (user && isSuperAdmin(user)) return <AdminDashboard />;
  return <PersonalDashboard />;
}

function PersonalDashboard() {
  const { user, ready, status, lastSync, online } = useApp();
  const { openNewSurvey } = useUi();
  const groups = useLocalSurveys();
  const catalog = useCatalog();
  const { remove } = useSurveyActions();

  const surveys = groups?.mine ?? null;
  const firstPullPending = lastSync === null && online && (status === "idle" || status === "syncing");
  const first = user?.name.split(" ")[0];

  if (!ready || surveys === null || !catalog.loaded || (surveys.length === 0 && catalog.departments.length === 0 && firstPullPending)) {
    return (
      <div className="stack">
        <div className="skeleton h-title" />
        <div className="skeleton h-card" />
        <div className="skeleton h-card" />
      </div>
    );
  }

  const drafts = surveys.filter((s) => s.status === "draft");
  const submitted = surveys.filter((s) => s.status === "submitted");
  const unsynced = surveys.filter((s) => s.dirty || s.conflict).length;
  const resume = drafts[0];
  const recent = surveys.filter((s) => s.id !== resume?.id).slice(0, 4);
  const myDepts = catalog.departments.filter((d) => user?.memberships.some((m) => m.departmentId === d.id));
  const led = myDepts.filter((d) => user && isLeadOf(user, d.id));
  const multiDept = myDepts.length > 1;

  return (
    <div className="stack gap-lg">
      <section>
        <h1 className="page-title">{greeting()}{first ? `, ${first}` : ""}</h1>
        <p className="muted">
          {myDepts.length === 0 ? "You’re not in a department yet." : surveys.length === 0 ? "Let’s capture your first site survey." : "Here’s where your surveys stand."}
        </p>
      </section>

      {myDepts.length === 0 && (
        <section className="card hero-empty">
          <div className="hero-icon"><Icon name="building" size={30} /></div>
          <h2>Waiting to be added to a team</h2>
          <p className="muted">A super admin or team lead adds people to departments. Once you’re in one, its survey forms appear here.</p>
        </section>
      )}

      {user && led.map((d) => <TeamPanel key={d.id} dept={d} selfId={user.id} surveys={groups?.all ?? []} />)}

      {myDepts.map((d) => {
        const forms = catalog.forms.filter((f) => f.departmentId === d.id && f.status === "active");
        const lead = user && isLeadOf(user, d.id);
        return (
          <section key={d.id} className="card dept-strip" aria-label={`${d.name} department`}>
            <div className="dept-strip-head">
              <IconTile icon={d.iconName} tone={d.tone} />
              <div className="dept-strip-title">
                <strong>{d.name} <span className="tag blue">{lead ? "Team lead" : "Member"}</span></strong>
                <span className="muted small">
                  {lead ? "You lead this department" : d.leadName ? <>Team lead: <strong>{d.leadName}</strong>{d.leadEmail && <> · <a className="link" href={`mailto:${d.leadEmail}`}>Email</a></>}</> : "No team lead assigned yet"}
                </span>
              </div>
            </div>
            {forms.length === 0 ? (
              <p className="muted small">No survey form has been published for {d.name} yet.</p>
            ) : (
              <div className="dept-forms">
                {forms.map((f) => (
                  <button key={f.id} className="btn secondary sm" onClick={() => openNewSurvey({ departmentId: d.id, formId: f.id })}>
                    <Icon name="plus" size={16} /> {forms.length > 1 || multiDept ? f.name : "Start a survey"}
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {myDepts.length > 0 &&
        (surveys.length === 0 ? (
          <section className="card hero-empty">
            <div className="hero-icon"><Icon name="clipboard" size={30} /></div>
            <h2>No surveys yet</h2>
            <p className="muted">Start a survey for a client site. Everything saves on this device first, so it works with no signal and syncs when you’re back online.</p>
            <button className="btn primary" onClick={() => openNewSurvey()} disabled={!user}>
              <Icon name="plus" size={18} /> Start a survey
            </button>
          </section>
        ) : (
          <>
            <section className="stats-row" aria-label="Summary">
              <Stat label="In progress" value={drafts.length} tone="blue" />
              <Stat label="Submitted" value={submitted.length} tone="green" />
              <Stat label="To sync" value={unsynced} tone={unsynced ? "amber" : ""} />
            </section>

            {resume && (
              <section>
                <h2 className="section-title">Continue where you left off</h2>
                <Link href={`/survey?id=${resume.id}`} className="card resume-card">
                  <ProgressRing pct={surveyProgress(catalog.formFor(resume.formId), resume.values).pct} size={56} />
                  <div className="resume-main">
                    <strong>{surveyTitle(catalog.formFor(resume.formId), resume.values)}</strong>
                    <span className="muted small ellipsis">{surveySubtitle(catalog.formFor(resume.formId), resume.values) || "No site address yet"}</span>
                  </div>
                  <span className="btn primary sm">Resume <Icon name="chevron-right" size={16} /></span>
                </Link>
              </section>
            )}

            {recent.length > 0 && (
              <section>
                <div className="section-head">
                  <h2 className="section-title">Recent</h2>
                  <Link href="/surveys" className="link">View all</Link>
                </div>
                <ul className="list">
                  {recent.map((s) => (
                    <SurveyCard key={s.id} survey={s} form={catalog.formFor(s.formId)} onDelete={remove} department={multiDept ? catalog.department(s.departmentId ?? "elv")?.code : undefined} />
                  ))}
                </ul>
              </section>
            )}
          </>
        ))}
    </div>
  );
}
