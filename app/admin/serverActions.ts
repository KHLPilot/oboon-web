"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function approveAgent(formData: FormData) {
    const userId = formData.get("userId") as string;
    if (!userId) return;

    await adminSupabase
        .from("profiles")
        .update({ role: "agent" })
        .eq("id", userId);

    revalidatePath("/admin");
}
