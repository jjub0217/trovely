import { NextResponse } from "next/server";
import { exchangeKakaoCode, fetchKakaoUser } from "@/lib/kakao";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

async function findUserByEmail(supabaseAdmin: AdminClient, email: string) {
  const perPage = 100;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error || !data) return null;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=kakao_${errorParam}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=kakao_no_code`);
  }

  try {
    const redirectUri = `${origin}/auth/kakao/callback`;
    const tokenData = await exchangeKakaoCode(code, redirectUri);
    const kakaoUser = await fetchKakaoUser(tokenData.access_token);

    const email = kakaoUser.kakao_account?.email;
    const nickname =
      kakaoUser.kakao_account?.profile?.nickname ||
      kakaoUser.properties?.nickname ||
      `kakao_${kakaoUser.id}`;

    if (!email) {
      return NextResponse.redirect(`${origin}/login?error=kakao_no_email`);
    }

    const supabaseAdmin = createAdminClient();

    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        provider: "kakao",
        kakao_id: kakaoUser.id,
        nickname,
        full_name: nickname,
      },
    });

    if (createError && !createData?.user) {
      const existing = await findUserByEmail(supabaseAdmin, email);
      if (!existing) {
        console.error("[kakao callback] failed to create or find user:", createError.message);
        return NextResponse.redirect(`${origin}/login?error=kakao_user`);
      }
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData.properties?.hashed_token) {
      console.error("[kakao callback] failed to generate magic link:", linkError?.message);
      return NextResponse.redirect(`${origin}/login?error=kakao_link`);
    }

    const confirmUrl = new URL(`${origin}/auth/confirm`);
    confirmUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
    confirmUrl.searchParams.set("type", "magiclink");
    confirmUrl.searchParams.set("next", "/");
    return NextResponse.redirect(confirmUrl.toString());
  } catch (err) {
    console.error("[kakao callback] error:", err);
    return NextResponse.redirect(`${origin}/login?error=kakao_failed`);
  }
}
