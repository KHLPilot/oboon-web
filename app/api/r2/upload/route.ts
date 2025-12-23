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

export async function POST(req: Request) {
    try {
        const form = await req.formData();
        const file = form.get("file") as File | null;
        const propertyId = form.get("propertyId") as string | null;

        if (!file || !propertyId) {
            return NextResponse.json({ error: "file/propertyId required" }, { status: 400 });
        }

        const ext = file.name.split(".").pop() || "jpg";
        const key = `properties/${propertyId}/main.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const body = Buffer.from(arrayBuffer);

        await r2.send(
            new PutObjectCommand({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
                Key: key,
                Body: body,
                ContentType: file.type || "application/octet-stream",
            })
        );

        const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;

        return NextResponse.json({ url: publicUrl });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "upload failed" }, { status: 500 });
    }
}
