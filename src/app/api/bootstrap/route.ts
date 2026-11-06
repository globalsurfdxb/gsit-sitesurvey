import { json, route } from "@/lib/api";
import { buildCatalog } from "@/lib/catalog.server";

export const dynamic = "force-dynamic";

/** The signed-in user (with memberships) plus the departments and forms they can see. Cached offline by the client. */
export const GET = route(async (_req, { user }) => json({ user, ...(await buildCatalog(user)) }));
