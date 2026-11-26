const KAKAO_AUTH_URL = "https://kauth.kakao.com/oauth/authorize";
const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const KAKAO_USER_URL = "https://kapi.kakao.com/v2/user/me";

export function buildKakaoAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "account_email,profile_nickname",
  });
  if (state) params.set("state", state);
  return `${KAKAO_AUTH_URL}?${params.toString()}`;
}

export type KakaoTokenResponse = {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
};

export async function exchangeKakaoCode(
  code: string,
  redirectUri: string
): Promise<KakaoTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.KAKAO_REST_API_KEY!,
    redirect_uri: redirectUri,
    code,
  });
  if (process.env.KAKAO_CLIENT_SECRET) {
    body.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
  }

  const response = await fetch(KAKAO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kakao token exchange failed: ${response.status} ${text}`);
  }
  return response.json();
}

export type KakaoUser = {
  id: number;
  kakao_account?: {
    email?: string;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
  properties?: {
    nickname?: string;
  };
};

export async function fetchKakaoUser(accessToken: string): Promise<KakaoUser> {
  const response = await fetch(KAKAO_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kakao user fetch failed: ${response.status} ${text}`);
  }
  return response.json();
}

const KAKAO_UNLINK_URL = "https://kapi.kakao.com/v1/user/unlink";

/**
 * 회원탈퇴 때 카카오와 Trovely의 연결을 끊는다(카카오 계정의 "연결된 서비스"에서 Trovely가 빠진다).
 * 사용자 토큰을 저장하지 않으므로 앱 어드민 키와 카카오 회원번호로 끊는다.
 * 어드민 키가 없으면 하지 않고 false를 돌려준다.
 */
export async function unlinkKakaoUser(kakaoId: number | string): Promise<boolean> {
  const adminKey = process.env.KAKAO_ADMIN_KEY;
  if (!adminKey) return false;
  const response = await fetch(KAKAO_UNLINK_URL, {
    method: "POST",
    headers: {
      Authorization: `KakaoAK ${adminKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ target_id_type: "user_id", target_id: String(kakaoId) }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kakao unlink failed: ${response.status} ${text}`);
  }
  return true;
}
