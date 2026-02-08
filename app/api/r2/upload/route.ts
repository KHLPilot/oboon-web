// app/api/r2/upload/route.ts

import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

function safeSeg(input: string) {
  return (input ?? "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);
}

function safeExt(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return ext.replace(/[^a-z0-9]/g, "") || "jpg";
}

function randomKeySegment() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const propertyId = form.get("propertyId") as string | null;
    const postId = (form.get("postId") as string | null)?.trim() || null;
    const userId = (form.get("userId") as string | null)?.trim() || null;
    const mode = ((form.get("mode") as string | null) ?? "").trim();
    const unitType = (form.get("unitType") as string | null)?.trim() || "";

    if (!file) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const resolvedMode =
      mode || (propertyId ? "property_main" : postId ? "briefing_cover" : "");

    const ext = safeExt(file.name);

    if (resolvedMode === "property_main") {
      if (!propertyId) {
        return NextResponse.json(
          { error: "propertyId required" },
          { status: 400 },
        );
      }

      const key = `properties/${propertyId}/main.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const body = Buffer.from(arrayBuffer);

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
          Key: key,
          Body: body,
          ContentType: file.type || "application/octet-stream",
        }),
      );

      const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
      return NextResponse.json({ url: publicUrl });
    }

    if (resolvedMode === "property_floor_plan") {
      if (!propertyId) {
        return NextResponse.json(
          { error: "propertyId required" },
          { status: 400 },
        );
      }

      const seg = safeSeg(unitType) || "floorplan";
      const key = `properties/${propertyId}/floor-plans/${randomKeySegment()}_${seg}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const body = Buffer.from(arrayBuffer);

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
          Key: key,
          Body: body,
          ContentType: file.type || "application/octet-stream",
        }),
      );

      // ✅ 누락되어 있던 반환 추가
      const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
      return NextResponse.json({ url: publicUrl });
    }

    if (resolvedMode === "briefing_cover") {
      if (!postId) {
        return NextResponse.json({ error: "postId required" }, { status: 400 });
      }

      const key = `briefing/posts/${postId}/cover.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const body = Buffer.from(arrayBuffer);

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
          Key: key,
          Body: body,
          ContentType: file.type || "application/octet-stream",
        }),
      );

      const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
      return NextResponse.json({ url: publicUrl });
    }

    if (resolvedMode === "briefing_content") {
      if (!postId) {
        return NextResponse.json({ error: "postId required" }, { status: 400 });
      }

      const key = `briefing/posts/${postId}/content/${randomKeySegment()}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const body = Buffer.from(arrayBuffer);

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
          Key: key,
          Body: body,
          ContentType: file.type || "application/octet-stream",
        }),
      );

      const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
      return NextResponse.json({ url: publicUrl });
    }

    if (resolvedMode === "agent_avatar") {
      if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
      }

      const key = `profiles/${userId}/avatar-${Date.now()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const body = Buffer.from(arrayBuffer);

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
          Key: key,
          Body: body,
          ContentType: file.type || "application/octet-stream",
        }),
      );

      const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
      return NextResponse.json({ url: publicUrl, key });
    }

    return NextResponse.json(
      {
        error:
          "invalid mode (property_main | property_floor_plan | briefing_cover | briefing_content | agent_avatar)",
      },
      { status: 400 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "upload failed" },
      { status: 500 },
    );
  }
}
