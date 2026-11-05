/**
 * One-off converter: ELV checklist HTML  ->  src/data/survey-schema.json
 *
 *   npx tsx scripts/extract-schema.ts "<path to checklist.html>"
 *
 * The generated JSON is the source of truth for the survey form. After the first
 * run it can be edited by hand (add/remove/rename fields) without touching UI code.
 * The script reports any form control it could not map so nothing is dropped silently.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const src = process.argv[2];
if (!src) {
  console.error("usage: tsx scripts/extract-schema.ts <checklist.html>");
  process.exit(1);
}

const dom = new JSDOM(readFileSync(src, "utf8"));
const doc = dom.window.document;

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const slug = (s: string) =>
  clean(s)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

const SECTION_KEYS: Record<string, string> = {
  s0: "client",
  s1: "cabling",
  s2: "cabinet",
  s3: "switch",
  s4: "cctv",
  s5: "access",
  s_acb: "access_bio",
  s6: "biometric",
  s7: "fiber",
  s8: "material",
  s9: "manpower",
  s10: "site",
};

type Block = Record<string, unknown> & { t: string };

// Data point groups are built by JS in the source file (not present in the markup).
const DATA_POINT_GROUPS = [
  {
    group: "Network & IT",
    color: "#38bdf8",
    items: [
      "Workstation data points", "Printer data points", "Meeting room data points",
      "Reception data points", "Manager room data points", "IP phone points",
      "WiFi access point", "TV HDMI point", "Video conference point",
      "Server to IDF uplink points", "Fiber uplink points", "Patch panel ports", "Network rack",
    ],
  },
  { group: "Surveillance", color: "#fb7185", items: ["Indoor camera points", "Outdoor camera points", "ANPR camera point", "NVR point"] },
  { group: "Access & Security", color: "#fbbf24", items: ["Access control points", "Door controller points", "Biometric device points", "Intercom points"] },
  { group: "AV & Power", color: "#a78bfa", items: ["Speaker points", "PA system points", "UPS power points"] },
  { group: "Spare", color: "#94a3b8", items: ["Spare data points"] },
];
const DEFAULT_MATERIALS = [
  "RCA Male Connector", "Insulation tape", "XLR Connector (male and female) Neutrik brand",
  "Spiral black 10mm - 10m", "RCA to Aux cable 1.5mtr", "3.5mm jack male",
  "RS 232 connector (male and female)", "XLR Connector (male and female)", "Brush Panel",
];
const MANPOWER_ROLES = [
  "ELV Technician", "Network Engineer", "Project Manager", "Site Engineer",
  "Cabling Technician", "Supervisor", "Helper", "Other",
];

const HEADING_SEL = ".client-section-label, .sub-section-title, .sc-sub-label, .cctv-group-title, .cam-section-title, .sira-heading, .sw-group-label";
const SKIP_SEL = ".mp-summary, .mat-toolbar, .mat-list-header, .add-mat-btn, .add-cam-set-btn, .add-row-btn, .dp-table-wrap, .mp-table-wrap, .action-bar";

const report: string[] = [];

function extractSection(card: Element) {
  const domId = card.id;
  const secKey = SECTION_KEYS[domId] ?? slug(card.querySelector("h3")?.textContent ?? domId);
  const body = card.querySelector(".sec-body")!;
  const seen = new Set<Element>();
  const usedKeys = new Set<string>();
  const blocks: Block[] = [];
  let headingPath = "";

  const mark = (el: Element) => {
    seen.add(el);
    el.querySelectorAll("input,select,textarea").forEach((c) => seen.add(c));
  };

  const uniqueKey = (label: string) => {
    const base = `${secKey}.${headingPath ? headingPath + "." : ""}${slug(label) || "field"}`;
    let k = base;
    let i = 2;
    while (usedKeys.has(k)) k = `${base}_${i++}`;
    usedKeys.add(k);
    return k;
  };

  const pillTexts = (root: Element, sel: string) =>
    [...root.querySelectorAll(sel)].map((p) => clean(p.textContent)).filter(Boolean);

  const labelOf = (field: Element, sel: string) => {
    const l = field.querySelector(sel);
    if (!l) return { label: "", required: false };
    const required = !!l.querySelector(".req-star");
    const clone = l.cloneNode(true) as Element;
    clone.querySelectorAll(".req-star").forEach((n) => n.remove());
    return { label: clean(clone.textContent), required };
  };

  function handleField(el: Element) {
    const { label, required } = labelOf(el, ".field-label");
    mark(el);
    if (el.querySelector(".pills")) {
      const options = pillTexts(el, ".pill-opt");
      const multi = !!el.querySelector('.pill-opt input[type="checkbox"]');
      blocks.push({ t: "choice", key: uniqueKey(label), label, options, multi, required });
    } else if (el.querySelector(".yn-wrap")) {
      blocks.push({ t: "choice", key: uniqueKey(label), label, options: ["Yes", "No"], multi: false, required });
    } else if (el.querySelector("textarea")) {
      const ta = el.querySelector("textarea")!;
      blocks.push({ t: "textarea", key: uniqueKey(label), label, placeholder: ta.getAttribute("placeholder") ?? "", required });
    } else if (el.querySelector("select")) {
      const options = [...el.querySelectorAll("select option")].map((o) => clean(o.textContent)).filter((o) => o && !o.startsWith("—"));
      blocks.push({ t: "select", key: uniqueKey(label), label, options, required });
    } else if (el.querySelector('input[type="date"]')) {
      blocks.push({ t: "date", key: uniqueKey(label), label, required, defaultToday: true });
    } else if (el.querySelector('input[type="number"]')) {
      const i = el.querySelector("input")!;
      blocks.push({ t: "number", key: uniqueKey(label), label, placeholder: i.getAttribute("placeholder") ?? "", required });
    } else if (el.querySelector('input[type="text"]')) {
      const i = el.querySelector("input")!;
      blocks.push({ t: "text", key: uniqueKey(label), label, placeholder: i.getAttribute("placeholder") ?? "", required });
    } else {
      report.push(`[${secKey}] unhandled .field: ${clean(el.outerHTML).slice(0, 140)}`);
    }
  }

  function walk(node: Element) {
    for (const el of [...node.children]) {
      if (el.matches(SKIP_SEL)) { mark(el); continue; }
      if (el.matches(HEADING_SEL)) {
        const text = clean(el.textContent);
        headingPath = slug(text);
        blocks.push({ t: "heading", text });
        continue;
      }
      if (el.matches(".field")) { handleField(el); continue; }

      if (el.matches(".cctv-row")) {
        const label = clean(el.querySelector(".cctv-row-label")?.textContent);
        const pills = [...el.querySelectorAll(".cctv-pill")];
        const multi = pills.length > 0 && pills[0].getAttribute("data-type") !== "radio";
        mark(el);
        blocks.push({ t: "choice", key: uniqueKey(label), label, options: pills.map((p) => clean(p.textContent)), multi });
        continue;
      }
      if (el.matches(".fchk-item")) {
        const label = clean(el.querySelector(".fchk-label")?.textContent);
        mark(el);
        blocks.push({ t: "check", key: uniqueKey(label), label, options: pillTexts(el, ".yn-sm") });
        continue;
      }
      if (el.matches(".fiber-route-wrap")) {
        const container = el.querySelector("[id]")!;
        const rows = [...el.querySelectorAll(".fiber-route-row")];
        const placeholders = rows.map((r) => {
          const ins = r.querySelectorAll("input.fr-input");
          return [ins[0]?.getAttribute("placeholder") ?? "", ins[1]?.getAttribute("placeholder") ?? ""];
        });
        mark(el);
        blocks.push({ t: "routes", key: uniqueKey(container.id || "routes"), placeholders });
        continue;
      }
      if (el.matches(".acc-table-wrap")) {
        const rows = [...el.querySelectorAll(".acc-row")].map((r) => {
          const label = clean(r.querySelector(".acc-item-label")?.textContent);
          const options = [...r.querySelectorAll(".acc-chip")].map((c) => ({
            value: c.querySelector("input")!.getAttribute("value") ?? clean(c.textContent),
            label: clean(c.textContent),
          }));
          return { key: slug(label), label, options };
        });
        mark(el);
        blocks.push({ t: "accessories", key: uniqueKey("accessories"), rows });
        continue;
      }
      if (el.matches(".fiber-equip-grid, .sc-equip-grid")) {
        const items = [...el.querySelectorAll(".feq-row")].map((r) => {
          const label = clean(r.querySelector(".feq-label")?.textContent);
          return { key: slug(label), label };
        });
        mark(el);
        blocks.push({ t: "qtyList", key: uniqueKey("equipment"), items });
        continue;
      }
      if (el.matches(".cctv-acc-row")) {
        const label = clean(el.querySelector(".ca-label")?.textContent);
        const yn = !!el.querySelector(".ca-yn");
        const qty = !!el.querySelector(".ca-qty");
        mark(el);
        blocks.push({ t: "choiceQty", key: uniqueKey(label), label, yn, qty });
        continue;
      }
      if (el.matches(".photo-grid, .ac-photo-grid")) {
        const slots = [...el.querySelectorAll(".photo-placeholder")].map((p) => {
          const clone = p.cloneNode(true) as Element;
          clone.querySelectorAll("span").forEach((s) => s.remove());
          const label = clean(clone.textContent);
          return { key: slug(label), label };
        });
        mark(el);
        blocks.push({ t: "photos", key: uniqueKey("photos"), slots });
        continue;
      }
      if (el.matches(".sira-upload-wrap")) {
        const fields = [...el.querySelectorAll(".sira-field")].map((f) => {
          const label = clean(f.querySelector(".sira-field-label")?.textContent);
          const pills = pillTexts(f, ".cctv-pill");
          return { label, options: pills };
        });
        mark(el);
        report.push(`[${secKey}] sira-upload-wrap fields: ${JSON.stringify(fields)}`);
        blocks.push({ t: "upload", key: uniqueKey("attachments"), label: "Attachments", typeOptions: fields.find((f) => f.options.length)?.options ?? [] });
        continue;
      }
      if (el.id === "cam-sets-wrap") { mark(el); blocks.push({ t: "cameraSets", key: `${secKey}.camera_sets` }); continue; }
      if (el.id === "dp-body" || el.querySelector("#dp-body")) { mark(el); blocks.push({ t: "dataPoints", key: `${secKey}.data_points`, groups: DATA_POINT_GROUPS }); continue; }
      if (el.id === "mat-list" || el.querySelector("#mat-list")) { /* handled below */ }
      walk(el);
    }
  }

  walk(body);

  // JS-built sections in the source are rendered from known structures.
  if (body.querySelector("#mat-list")) {
    blocks.length = 0;
    blocks.push({ t: "materials", key: `${secKey}.items`, defaults: DEFAULT_MATERIALS });
    body.querySelectorAll("input,select,textarea").forEach((c) => seen.add(c));
  }
  if (body.querySelector("#mp-body")) {
    blocks.length = 0;
    blocks.push({ t: "manpower", key: `${secKey}.resources`, roles: MANPOWER_ROLES });
    body.querySelectorAll("input,select,textarea").forEach((c) => seen.add(c));
  }

  // The source markup's client section only has the GS IT internal fields, although its
  // subtitle promises "contact" details. Add the client identity fields a survey needs.
  if (secKey === "client") {
    blocks.push(
      { t: "heading", text: "Client details" },
      { t: "text", key: "client.client_details.client_name", label: "Client / company name", placeholder: "e.g. Acme Trading LLC", required: true },
      { t: "text", key: "client.client_details.contact_person", label: "Contact person", placeholder: "Name at site", required: false },
      { t: "text", key: "client.client_details.contact_phone", label: "Contact phone", placeholder: "+971 …", required: false },
      { t: "text", key: "client.client_details.contact_email", label: "Contact email", placeholder: "name@company.com", required: false },
    );
  }

  // Audit: any control in the section we never mapped?
  body.querySelectorAll("input,select,textarea").forEach((c) => {
    if (!seen.has(c)) report.push(`[${secKey}] UNMAPPED control: ${clean(c.outerHTML).slice(0, 140)}`);
  });

  const icon = clean(card.querySelector(".sec-icon")?.textContent);
  const iconClass = [...(card.querySelector(".sec-icon")?.classList ?? [])].find((c) => c.startsWith("ic-"))?.slice(3) ?? "slate";
  return {
    key: secKey,
    title: clean(card.querySelector("h3")?.textContent),
    subtitle: clean(card.querySelector(".sec-meta p")?.textContent),
    icon,
    tone: iconClass,
    blocks,
  };
}

const cards = [...doc.querySelectorAll(".sec-card")];
const sections = cards.map(extractSection);

const out = {
  title: clean(doc.querySelector("h1")?.textContent),
  subtitle: clean(doc.querySelector(".header-title p")?.textContent),
  sections,
};

const dest = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/survey-schema.json");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(out, null, 2));

// Summary
console.log(`wrote ${dest}`);
for (const s of sections) {
  const counts: Record<string, number> = {};
  for (const b of s.blocks) counts[b.t] = (counts[b.t] ?? 0) + 1;
  console.log(`${s.key.padEnd(11)} ${String(s.blocks.length).padStart(3)} blocks`, JSON.stringify(counts));
}
console.log(report.length ? "\nREPORT:\n" + report.join("\n") : "\nno unmapped controls");
