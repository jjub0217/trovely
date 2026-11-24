import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DEMO_MODE, DEMO_USER_ID } from "@/lib/demo";
import { prisma } from "./db";

export async function requireAuth(): Promise<string> {
  if (DEMO_MODE) return DEMO_USER_ID;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

/** 관리자(AdminRole)만 통과. 아니면 홈으로 돌려보낸다. ("use server" 파일 밖에 두어 클라이언트에서 직접 호출할 수 없게 한다) */
export async function requireAdmin(): Promise<string> {
  if (DEMO_MODE) return DEMO_USER_ID;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const adminRole = await prisma.adminRole.findUnique({ where: { userId: user.id } });
  if (!adminRole) redirect("/");

  return user.id;
}
