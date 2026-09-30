import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionUser, ROLES } from "@/lib/auth";
import Shell from "@/components/shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <Shell
      user={{
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        roleLabel: ROLES[user.role]?.label ?? user.role,
        permissions: user.permissions,
        theme: user.theme,
        lastLoginAt: user.lastLoginAt,
      }}
    >
      {children}
    </Shell>
  );
}
