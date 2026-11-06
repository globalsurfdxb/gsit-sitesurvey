import type { LocalSurvey } from "@/lib/local-db";

export interface PersonStats {
  total: number;
  draft: number;
  submitted: number;
  lastActivity?: number;
}

/** A person's survey counts in one department, from the surveys on this device. */
export function statsFor(surveys: LocalSurvey[], ownerId: string, departmentId: string): PersonStats {
  const mine = surveys.filter((s) => s.ownerId === ownerId && (s.departmentId ?? "elv") === departmentId);
  return {
    total: mine.length,
    draft: mine.filter((s) => s.status === "draft").length,
    submitted: mine.filter((s) => s.status === "submitted").length,
    lastActivity: mine.reduce<number | undefined>((m, s) => (m === undefined || s.updatedAt > m ? s.updatedAt : m), undefined),
  };
}

export const ago = (t: number | undefined) => {
  if (!t) return "No activity yet";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return days < 14 ? `${days} d ago` : new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";
