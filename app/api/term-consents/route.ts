import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * POST /api/term-consents
 * 약관 동의 기록 저장 (법적 증거용)
 *
 * Request body:
 * {
 *   termTypes: string[],     // ['signup_terms', 'signup_privacy', ...]
 *   context: 'signup' | 'reservation' | 'agent_approval',
 *   contextId?: string       // 예약ID 등 (optional)
 * }
 */
export async function POST(request: NextRequest) {
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

    // 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { termTypes, context, contextId } = body;

    // 필수 파라미터 검증
    if (!termTypes || !Array.isArray(termTypes) || termTypes.length === 0) {
      return NextResponse.json(
        { error: 'termTypes는 필수이며 배열이어야 합니다.' },
        { status: 400 }
      );
    }

    const validContexts = ['signup', 'reservation', 'agent_approval'];
    if (!context || !validContexts.includes(context)) {
      return NextResponse.json(
        { error: `context는 ${validContexts.join(', ')} 중 하나여야 합니다.` },
        { status: 400 }
      );
    }

    // 클라이언트 메타데이터 수집 (법적 증거용)
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    // 각 termType의 활성 버전 조회
    const { data: terms, error: termsError } = await supabase
      .from('terms')
      .select('id, type, version, title, content')
      .in('type', termTypes)
      .eq('is_active', true);

    if (termsError) {
      console.error('약관 조회 실패:', termsError);
      return NextResponse.json({ error: '약관 조회에 실패했습니다.' }, { status: 500 });
    }

    if (!terms || terms.length === 0) {
      return NextResponse.json(
        { error: '활성화된 약관을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 요청된 모든 약관 타입이 존재하는지 확인
    const foundTypes = terms.map((t) => t.type);
    const missingTypes = termTypes.filter((t: string) => !foundTypes.includes(t));
    if (missingTypes.length > 0) {
      return NextResponse.json(
        { error: `다음 약관을 찾을 수 없습니다: ${missingTypes.join(', ')}` },
        { status: 404 }
      );
    }

    // 동의 기록 INSERT 준비
    const consentsToInsert = terms.map((term) => ({
      user_id: user.id,
      term_id: term.id,
      term_type: term.type,
      term_version: term.version,
      ip_address: ipAddress,
      user_agent: userAgent,
      context: context,
      context_id: contextId || null,
      term_title_snapshot: term.title,
      term_content_snapshot: term.content,
    }));

    // 동의 기록 저장
    const { data: insertedConsents, error: insertError } = await supabase
      .from('term_consents')
      .insert(consentsToInsert)
      .select('id, term_type');

    if (insertError) {
      console.error('동의 기록 저장 실패:', insertError);
      return NextResponse.json(
        { error: '동의 기록 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      consents: insertedConsents,
      message: `${insertedConsents?.length || 0}개의 약관 동의가 기록되었습니다.`,
    });
  } catch (error) {
    console.error('term-consents API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * GET /api/term-consents
 * 본인의 동의 기록 조회
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context');
    const contextId = searchParams.get('contextId');

    let query = supabase
      .from('term_consents')
      .select('id, term_type, term_version, consented_at, context, context_id')
      .eq('user_id', user.id)
      .order('consented_at', { ascending: false });

    if (context) {
      query = query.eq('context', context);
    }
    if (contextId) {
      query = query.eq('context_id', contextId);
    }

    const { data: consents, error: queryError } = await query;

    if (queryError) {
      console.error('동의 기록 조회 실패:', queryError);
      return NextResponse.json(
        { error: '동의 기록 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ consents });
  } catch (error) {
    console.error('term-consents GET API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
