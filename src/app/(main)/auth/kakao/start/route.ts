import { NextResponse } from "next/server";
import { buildKakaoAuthUrl } from "@/lib/kakao";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/auth/kakao/callback`;
  const authUrl = buildKakaoAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
