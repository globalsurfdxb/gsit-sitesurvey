"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { formatBytes } from "@/lib/files";
import { getSurvey, type LocalSurvey } from "@/lib/local-db";
import { isAnswered, isSkipped, schema, surveyProgress, surveySubtitle, surveyTitle } from "@/lib/survey";
import type { BlockDef, CameraSet, FileRef, ManpowerRow, MaterialRow, RouteRow, UploadValue } from "@/lib/types";
import { useFileUrl } from "./survey/media";

const n = (s: unknown) => parseFloat(String(s ?? "")) || 0;

function Img({ file, label }: { file: FileRef; label: string }) {
  const { url } = useFileUrl(file);
  return (
    <figure className="rp-photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt={label} /> : <div className="rp-photo-ph" />}
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/** Plain-language rendering of one answered block. */
function renderValue(b: BlockDef, v: unknown): ReactNode {
  switch (b.t) {
    case "choice":
      return Array.isArray(v) ? v.join(", ") : String(v);
    case "routes": {
      const rows = (v as RouteRow[]).filter((r) => r.from || r.to || r.distance);
      return (
        <table className="rp-table">
          <thead><tr><th>From</th><th>To</th><th>Distance (mtr)</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td>{r.from}</td><td>{r.to}</td><td>{r.distance}</td></tr>)}</tbody>
        </table>
      );
    }
    case "accessories": {
      const o = v as Record<string, Record<string, string>>;
      return (
        <ul className="rp-list">
          {b.rows.filter((r) => o[r.key] && Object.keys(o[r.key]).length).map((r) => (
            <li key={r.key}><strong>{r.label}:</strong> {r.options.filter((x) => x.value in o[r.key]).map((x) => `${x.label}${o[r.key][x.value] ? ` × ${o[r.key][x.value]}` : ""}`).join(", ")}</li>
          ))}
        </ul>
      );
    }
    case "qtyList": {
      const o = v as Record<string, string>;
      return <ul className="rp-list">{b.items.filter((i) => o[i.key]).map((i) => <li key={i.key}>{i.label}: <strong>{o[i.key]}</strong></li>)}</ul>;
    }
    case "choiceQty": {
      const c = v as { yn?: string; qty?: string };
      return [c.yn, c.qty ? `qty ${c.qty}` : ""].filter(Boolean).join(" · ");
    }
    case "dataPoints": {
      const o = v as Record<string, string>;
      const total = Object.values(o).reduce((s, x) => s + (parseInt(x) || 0), 0);
      return (
        <table className="rp-table">
          <tbody>
            {b.groups.flatMap((g) => g.items.filter((i) => o[i]).map((i) => <tr key={i}><td>{i}</td><td>{o[i]}</td></tr>))}
            <tr className="rp-total"><td>Total data points</td><td>{total}</td></tr>
          </tbody>
        </table>
      );
    }
    case "materials": {
      const rows = v as MaterialRow[];
      return (
        <table className="rp-table">
          <thead><tr><th>#</th><th>Material</th><th>Qty</th><th>Done</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={r.id}><td>{i + 1}</td><td>{r.name}</td><td>{r.qty}</td><td>{r.done ? "✓" : ""}</td></tr>)}</tbody>
        </table>
      );
    }
    case "manpower": {
      const rows = v as ManpowerRow[];
      const hc = rows.reduce((s, r) => s + n(r.headcount), 0);
      const md = rows.reduce((s, r) => s + n(r.headcount) * n(r.days), 0);
      const mh = rows.reduce((s, r) => s + n(r.headcount) * n(r.days) * n(r.hoursPerDay), 0);
      return (
        <table className="rp-table">
          <thead><tr><th>Resource</th><th>Role</th><th>Scope</th><th>Heads</th><th>Days</th><th>Hrs/day</th></tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.role}</td><td>{r.designation}</td><td>{r.headcount}</td><td>{r.days}</td><td>{r.hoursPerDay}</td></tr>)}
            <tr className="rp-total"><td colSpan={3}>Total</td><td>{hc}</td><td colSpan={2}>{md} man-days · {mh} man-hours</td></tr>
          </tbody>
        </table>
      );
    }
    case "cameraSets": {
      const sets = (v as CameraSet[]).filter((s) => isAnswered({ t: "cameraSets", key: "" }, [s]));
      return (
        <ul className="rp-list">
          {sets.map((s, i) => (
            <li key={s.id}>
              <strong>Set {i + 1}{s.qty ? ` — ${s.qty} cameras` : ""}</strong>
              <div className="muted small">{[s.type, s.brand, s.resolution, s.night, s.audio, s.ai].filter((x) => x.length).map((x) => x.join(" / ")).join(" · ")}</div>
            </li>
          ))}
        </ul>
      );
    }
    case "upload": {
      const u = v as UploadValue;
      return (
        <div>
          {u.types.length > 0 && <div className="muted small">{u.types.join(", ")}</div>}
          <ul className="rp-list">{u.files.map((f) => <li key={f.id}>📄 {f.name} <span className="muted small">({formatBytes(f.size)})</span></li>)}</ul>
        </div>
      );
    }
    default:
      return String(v);
  }
}

export function Report() {
  const id = useSearchParams().get("id");
  const [rec, setRec] = useState<LocalSurvey | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    getSurvey(id).then((s) => setRec(s ?? null));
  }, [id]);

  if (id && rec === undefined) return <div className="center muted">Loading…</div>;
  if (!rec) return <div className="center"><p>Survey not found on this device.</p><Link className="btn primary" href="/">Back</Link></div>;

  const v = rec.values;
  const p = surveyProgress(v);

  return (
    <article className="report">
      <div className="no-print rp-actions">
        <Link className="btn ghost" href={`/survey?id=${rec.id}`}>← Edit</Link>
        <button className="btn amber" onClick={() => window.print()}>Print / save as PDF</button>
      </div>

      <header className="rp-head">
        <div className="logo">GS IT</div>
        <div>
          <h1>{schema.title}</h1>
          <h2>{surveyTitle(v)}</h2>
          <p className="muted small">{surveySubtitle(v)}</p>
          <p className="muted small">Status: {rec.status} · Required fields {p.done}/{p.total}</p>
        </div>
      </header>

      {schema.sections.map((sec) => {
        if (isSkipped(v, sec.key)) return null;
        const out: ReactNode[] = [];
        let heading: string | null = null;
        for (const [i, b] of sec.blocks.entries()) {
          if (b.t === "heading") {
            heading = b.text;
            continue;
          }
          const val = v[b.key];
          if (!isAnswered(b, val)) continue;
          if (heading) {
            out.push(<h4 className="rp-sub" key={`h${i}`}>{heading}</h4>);
            heading = null;
          }
          if (b.t === "photos") {
            const photos = val as Record<string, FileRef>;
            out.push(
              <div className="rp-photos" key={b.key}>
                {b.slots.filter((s) => photos[s.key]).map((s) => <Img key={s.key} file={photos[s.key]} label={s.label} />)}
              </div>,
            );
          } else {
            const label = "label" in b ? b.label : "";
            const wide = ["routes", "accessories", "qtyList", "dataPoints", "materials", "manpower", "cameraSets", "upload"].includes(b.t);
            out.push(
              <div className={`rp-row${wide ? " wide" : ""}`} key={b.key}>
                {label && <div className="rp-label">{label}</div>}
                <div className="rp-val">{renderValue(b, val)}</div>
              </div>,
            );
          }
        }
        return (
          <section className="rp-sec" key={sec.key}>
            <h3>{sec.title}</h3>
            {out.length ? <Fragment>{out}</Fragment> : <p className="muted small">No entries.</p>}
          </section>
        );
      })}
    </article>
  );
}
