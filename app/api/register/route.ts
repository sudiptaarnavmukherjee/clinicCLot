import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { user_id, pharmacy_name, phone, address, email } = await request.json();

    if (!user_id || !pharmacy_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use service role to bypass RLS — safe because this is server-side only
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const slug =
      pharmacy_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) +
      "-" +
      Math.random().toString(36).slice(2, 6);

    const { data, error } = await supabase
      .from("pharmacies")
      .insert({
        user_id,
        name: pharmacy_name,
        slug,
        phone: phone || null,
        address: address || null,
        email: email || null,
      })
      .select("id, slug")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pharmacy: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
