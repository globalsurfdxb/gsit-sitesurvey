import { canManageDepartment, isSuperAdmin, memberDepartments } from "./access";
import { departments, forms, surveys, users } from "./mongo";
import type { Catalog, DepartmentInfo, FormInfo, SessionUser, TeamMember } from "./types";

/**
 * Everything a client needs to render department- and form-driven screens, scoped to what this user may see:
 *  - departments they belong to (super admins: all), with the lead's name for everyone,
 *    and the member list + survey totals only for people who manage that department
 *  - those departments' forms (members see active ones; managers also see archived ones)
 * It is cached on the device so the app keeps working offline.
 */
export async function buildCatalog(user: SessionUser): Promise<Catalog> {
  const all = await (await departments()).find().sort({ createdAt: 1 }).toArray();
  const visible = isSuperAdmin(user) ? all : all.filter((d) => memberDepartments(user).includes(d._id));
  const ids = visible.map((d) => d._id);
  const managed = new Set(ids.filter((id) => canManageDepartment(user, id)));

  const people = ids.length
    ? await (await users()).find({ "memberships.departmentId": { $in: ids } }, { projection: { name: 1, email: 1, memberships: 1, createdAt: 1 } }).toArray()
    : [];
  const byDept = new Map<string, TeamMember[]>();
  for (const p of people) {
    for (const m of p.memberships ?? []) {
      if (!ids.includes(m.departmentId)) continue;
      const list = byDept.get(m.departmentId) ?? [];
      list.push({ id: p._id.toHexString(), name: p.name, email: p.email, role: m.role, joinedAt: p.createdAt });
      byDept.set(m.departmentId, list);
    }
  }

  const stats = new Map<string, DepartmentInfo["stats"]>();
  if (managed.size) {
    const rows = await (await surveys())
      .aggregate<{ _id: { d: string; s: string }; n: number; last: number }>([
        { $match: { departmentId: { $in: [...managed] } } },
        { $group: { _id: { d: "$departmentId", s: "$status" }, n: { $sum: 1 }, last: { $max: "$updatedAt" } } },
      ])
      .toArray();
    for (const r of rows) {
      const cur = stats.get(r._id.d) ?? { total: 0, draft: 0, submitted: 0 };
      cur.total += r.n;
      if (r._id.s === "submitted") cur.submitted += r.n;
      else cur.draft += r.n;
      cur.lastActivity = Math.max(cur.lastActivity ?? 0, r.last);
      stats.set(r._id.d, cur);
    }
  }

  const infos: DepartmentInfo[] = visible.map((d) => {
    const team = (byDept.get(d._id) ?? []).sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "lead" ? -1 : 1));
    const lead = team.find((m) => m.role === "lead");
    return {
      id: d._id,
      name: d.name,
      code: d.code,
      description: d.description,
      tone: d.tone,
      iconName: d.iconName,
      createdAt: d.createdAt,
      leadId: lead?.id,
      leadName: lead?.name,
      leadEmail: lead?.email,
      memberCount: team.length,
      ...(managed.has(d._id) ? { members: team } : {}),
      stats: stats.get(d._id) ?? { total: 0, draft: 0, submitted: 0 },
    };
  });

  const formDocs = ids.length ? await (await forms()).find({ departmentId: { $in: ids } }).sort({ createdAt: 1 }).toArray() : [];
  const formInfos: FormInfo[] = formDocs
    .filter((f) => f.status === "active" || managed.has(f.departmentId))
    .map((f) => ({
      id: f._id,
      departmentId: f.departmentId,
      name: f.name,
      description: f.description,
      status: f.status,
      version: f.version,
      updatedAt: f.updatedAt,
      schema: f.schema,
    }));

  return { departments: infos, forms: formInfos, fetchedAt: Date.now() };
}
