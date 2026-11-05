import { json, route } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async (_req, { user }) => json({ user }));
