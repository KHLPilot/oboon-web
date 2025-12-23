import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { id, email, name, phoneNumber, userType } = await req.json();

    if (!id || !email || !name || !phoneNumber || !userType) {
      return NextResponse.json({ error: "필수 값 누락" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("profiles").insert({
      id,
      email,
      name,
      phone_number: phoneNumber,
      user_type: userType,
      role: "user",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
