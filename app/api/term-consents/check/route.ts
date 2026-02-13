import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * GET /api/term-consents/check
 * 로그인 유저의 필수 약관 동의 여부 확인
 *
 * Returns:
 * {
 *   needsConsent: boolean,
 *   missingTermTypes: string[]  // 미동의 필수 약관 타입 목록
 * }
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // 읽기 전용 컨텍스트에서는 무시
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 1. 활성화된 필수 약관 조회 (signup_ 으로 시작하는 것만)
    const { data: requiredTerms, error: termsError } = await supabase
      .from('terms')
      .select('type, version')
      .eq('is_active', true)
      .eq('is_required', true)
      .like('type', 'signup_%');

    if (termsError) {
      console.error('약관 조회 실패:', termsError);
      return NextResponse.json({ error: '약관 조회에 실패했습니다.' }, { status: 500 });
    }

    if (!requiredTerms || requiredTerms.length === 0) {
      // 필수 약관이 없으면 동의 필요 없음
      return NextResponse.json({ needsConsent: false, missingTermTypes: [] });
    }

    // 2. 유저의 동의 기록 조회 (각 타입별 최신 버전만)
    const { data: userConsents, error: consentsError } = await supabase
      .from('term_consents')
      .select('term_type, term_version')
      .eq('user_id', user.id)
      .in('term_type', requiredTerms.map(t => t.type));

    if (consentsError) {
      console.error('동의 기록 조회 실패:', consentsError);
      return NextResponse.json({ error: '동의 기록 조회에 실패했습니다.' }, { status: 500 });
    }

    // 3. 미동의 또는 버전 불일치 약관 찾기
    const consentMap = new Map<string, number>();
    (userConsents || []).forEach(consent => {
      const existing = consentMap.get(consent.term_type);
      if (!existing || consent.term_version > existing) {
        consentMap.set(consent.term_type, consent.term_version);
      }
    });

    const missingTermTypes: string[] = [];
    for (const term of requiredTerms) {
      const userVersion = consentMap.get(term.type);
      // 동의 기록이 없거나 버전이 낮으면 재동의 필요
      if (!userVersion || userVersion < term.version) {
        missingTermTypes.push(term.type);
      }
    }

    return NextResponse.json({
      needsConsent: missingTermTypes.length > 0,
      missingTermTypes,
    });
  } catch (error) {
    console.error('term-consents check API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
