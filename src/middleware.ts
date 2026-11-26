import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE } from "@/lib/demo";

export async function middleware(request: NextRequest) {
  // 데모 모드: 인증 로직(Supabase 호출 포함)을 통째로 건너뛰고 모든 페이지 허용
  if (DEMO_MODE) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 쿠키만 읽는 getSession() 대신 Supabase 서버에 확인하는 getUser()를 쓴다.
  // 탈퇴로 계정이 지워졌는데 다른 기기에 예전 쿠키가 남아 있으면, getSession()은 로그인으로 보고
  // 페이지의 requireAuth()는 로그인 화면으로 보내서 / ↔ /login 무한 이동이 생겼다(2026-11-26 확인).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 개인정보 처리방침은 로그인 여부와 상관없이 누구나 본다
  if (request.nextUrl.pathname.startsWith("/privacy")) return supabaseResponse;

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/auth/");

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Admin route protection is handled by requireAdmin() in server actions
  // Middleware only ensures user is authenticated

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.svg|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|webp)$).*)",
  ],
};
