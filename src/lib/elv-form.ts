import raw from "@/data/survey-schema.json";
import type { FormSchema, SectionDef, SectionScope } from "./types";

/** Id of the built-in ELV form. Surveys created before departments existed belong to it. */
export const ELV_FORM_ID = "elv-site-survey";
export const ELV_DEPARTMENT_ID = "elv";

const SHORT: Record<string, string> = {
  client: "Client",
  cabling: "Cabling",
  cabinet: "Cabinet",
  switch: "Switch",
  cctv: "CCTV",
  access: "Access",
  access_bio: "Access + Bio",
  biometric: "Biometric",
  fiber: "Fiber",
  material: "Material",
  manpower: "Manpower",
  site: "Site",
};

const ICON: Record<string, string> = {
  client: "briefcase",
  cabling: "plug",
  cabinet: "server",
  switch: "network",
  cctv: "video",
  access: "lock",
  access_bio: "shield",
  biometric: "user-check",
  fiber: "zap",
  material: "package",
  manpower: "users",
  site: "map-pin",
};

const ALWAYS = ["client", "site"];
const BY_DEFAULT = ["cabling", "cabinet", "switch", "cctv", "access", "material", "manpower"];
const SUPPORT = ["material", "manpower"];

const scopeOf = (key: string): SectionScope => (ALWAYS.includes(key) ? "always" : BY_DEFAULT.includes(key) ? "default" : "optional");

/** The ELV pre-sale checklist as a form definition (source of the seeded ELV form and the offline fallback). */
export const ELV_FORM: FormSchema = {
  title: (raw as { title: string }).title,
  subtitle: (raw as { subtitle: string }).subtitle,
  meta: {
    refKey: "client.gs_it_internal.deal_id",
    clientKey: "client.client_details.client_name",
    siteKey: "site.site_address",
    engineerKey: "client.gs_it_internal.survey_engineer",
    dateKey: "client.gs_it_internal.survey_date",
  },
  sections: (raw as unknown as { sections: SectionDef[] }).sections.map((s) => {
    const { icon, ...rest } = s; // drop the legacy emoji
    void icon;
    return {
      ...rest,
      iconName: ICON[s.key] ?? "clipboard",
      short: SHORT[s.key] ?? s.title.split(/\s+/)[0],
      scope: scopeOf(s.key),
      ...(SUPPORT.includes(s.key) ? { support: true } : {}), // no `undefined` values: MongoDB would store them as null
    };
  }),
};
