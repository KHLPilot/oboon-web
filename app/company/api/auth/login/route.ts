// app/company/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, company_name } = body as {
    email: string;
    password: string;
    company_name: string;
  };

  // 🔹 서버에서 Supabase admin 권한 사용
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // 반드시 Service Role Key 사용
  );

  // 1) 기업 계정 생성 (auth.users)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      user_type: "company",     // ⭐ 기업 계정 표시 핵심
      company_name,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 2) profiles 테이블에도 기업 정보 생성 (선택)
  await supabase.from("profiles").upsert({
    id: data.user.id,
    email,
    name: company_name,
    role: "company",
    user_type: "company",
  });

  return NextResponse.json({ success: true });
}