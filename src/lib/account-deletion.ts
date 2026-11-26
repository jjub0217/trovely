import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { unlinkKakaoUser } from "@/lib/kakao";

export const WITHDRAWAL_REASONS = [
  "SERVICE_DISSATISFACTION",
  "PRIVACY_CONCERN",
  "LOW_USAGE",
  "COMPETITOR",
  "OTHER",
] as const;

export type DeleteAccountResult = { success: true; kakaoUnlinked: boolean | null } | { error: string };

/**
 * 회원탈퇴: 앱 데이터와 Supabase 로그인 계정을 함께 지운다.
 * - 앱 데이터 삭제, 탈퇴 통계 기록, 로그인 계정 삭제를 한 DB 트랜잭션 안에서 한다.
 *   로그인 계정 삭제가 실패하면 예외를 던져 앱 데이터 삭제도 되돌린다(일부만 지워진 채 "탈퇴 완료"가 되지 않게).
 * - 탈퇴 통계에는 사유와 날짜만 남긴다(이메일, 사용자 ID, 직접 쓴 사유는 남기지 않는다).
 * - 카카오 연결 끊기는 계정이 지워진 뒤에 시도한다. 실패해도 탈퇴는 완료로 본다(Trovely 쪽 데이터는 이미 없고,
 *   카카오 쪽 연결 목록에만 남는다). 결과는 kakaoUnlinked로 돌려준다(null = 카카오 가입자가 아님).
 */
export async function deleteAccountData(userId: string, reason: string): Promise<DeleteAccountResult> {
  if (!(WITHDRAWAL_REASONS as readonly string[]).includes(reason)) {
    return { error: "탈퇴 사유를 선택해 주세요." };
  }

  const admin = createAdminClient();
  const { data: found, error: findError } = await admin.auth.admin.getUserById(userId);
  if (findError || !found.user) {
    return { error: "계정 정보를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
  const kakaoId = found.user.user_metadata?.provider === "kakao" ? found.user.user_metadata?.kakao_id : undefined;

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.reelCategory.deleteMany({ where: { reel: { userId } } });
        await tx.reelTag.deleteMany({ where: { reel: { userId } } });
        await tx.reel.deleteMany({ where: { userId } });
        await tx.category.deleteMany({ where: { userId } });
        await tx.tag.deleteMany({ where: { userId } });
        await tx.adminRole.deleteMany({ where: { userId } });
        // 인스타그램 가져오기 중간 기록(후보의 캡션, 컬렉션 이름)도 지운다. 후보는 배치를 지우면 함께 지워진다.
        await tx.importBatch.deleteMany({ where: { userId } });
        await tx.withdrawal.create({ data: { reason } });

        // 마지막에 로그인 계정을 지운다. 실패하면 위의 삭제가 모두 되돌려진다.
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw new Error(`auth deleteUser failed: ${error.message}`);
      },
      { timeout: 15000 },
    );
  } catch (e) {
    console.error("[deleteAccount] 탈퇴 처리 실패", e instanceof Error ? e.message : e);
    return { error: "탈퇴를 처리하지 못했습니다. 데이터는 그대로 있으니 잠시 뒤 다시 시도해 주세요." };
  }

  let kakaoUnlinked: boolean | null = null;
  if (kakaoId !== undefined && kakaoId !== null) {
    try {
      kakaoUnlinked = await unlinkKakaoUser(kakaoId);
    } catch (e) {
      kakaoUnlinked = false;
      console.error("[deleteAccount] 카카오 연결 끊기 실패", e instanceof Error ? e.message : e);
    }
  }
  return { success: true, kakaoUnlinked };
}
