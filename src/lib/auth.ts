import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DEMO_MODE, DEMO_USER_ID } from "@/lib/demo";

export async function requireAuth(): Promise<string> {
  if (DEMO_MODE) return DEMO_USER_ID;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}
