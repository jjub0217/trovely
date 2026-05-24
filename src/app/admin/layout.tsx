import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./admin-nav";
import { AdminHeader } from "./admin-header";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin | Trovely",
};

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/admin", label: "대시보드", icon: "LayoutDashboard" as const },
  {
    label: "회원 관리",
    icon: "Users" as const,
    children: [
      { href: "/admin/members/users", label: "유저 관리" },
      { href: "/admin/members/withdrawals", label: "탈퇴 관리" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminRole = await prisma.adminRole.findUnique({ where: { userId: user.id } });
  if (!adminRole) redirect("/");

  const email = user.email || "";

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">
      <AdminSidebar items={navItems} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader email={email} />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
