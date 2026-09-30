import { NextResponse } from "next/server";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";
import { audit, getClientIp } from "@/lib/system";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (user) await audit({ user, action: "logout", entity: "user", entityId: user.id, ip: getClientIp(req) });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
