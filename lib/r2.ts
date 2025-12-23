// lib/r2.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
});

export async function uploadPropertyImageToR2(
    file: File,
    propertyId: number
) {
    const buffer = Buffer.from(await file.arrayBuffer());

    const ext = file.name.split(".").pop() ?? "jpg";
    const key = `properties/${propertyId}/main.${ext}`;

    await r2.send(
        new PutObjectCommand({
            Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        })
    );

    return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}
