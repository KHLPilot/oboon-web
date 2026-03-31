import { NextResponse } from "next/server";
import { adminSupabase, requireAdminRoute } from "@/lib/api/admin-route";

export async function GET() {
    const auth = await requireAdminRoute();
    if (!auth.ok) {
        return auth.response;
    }

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
