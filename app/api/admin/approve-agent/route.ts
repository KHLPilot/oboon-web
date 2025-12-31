import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const { userId } = await req.json();

    const { error } = await adminSupabase
        .from("profiles")
        .update({ role: "agent" })
        .eq("id", userId);

    if (error) {
        console.error(error);
        return NextResponse.json({ error: "승인 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}