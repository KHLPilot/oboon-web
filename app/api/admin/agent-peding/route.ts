import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    const { data, error } = await adminSupabase
        .from("profiles")
        .select("id, email, name, phone_number, role, created_at")
        .eq("role", "agent_pending")
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        return NextResponse.json({ error: "조회 실패" }, { status: 500 });
    }

    return NextResponse.json(data);
}