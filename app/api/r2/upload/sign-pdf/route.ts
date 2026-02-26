import { NextResponse } from "next/server";
import { SignatureV4 } from "@smithy/signature-v4";
import { HttpRequest } from "@smithy/protocol-http";
import { Hash } from "@smithy/hash-node";
import { createSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const MAX_PDF_SIZE = 150 * 1024 * 1024;
const SIGN_EXPIRES_IN_SECONDS = 60 * 10;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
const R2_PUBLIC_BASE_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;
const R2_ACCOUNT_HOST = `${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_BUCKET_HOST = `${R2_BUCKET_NAME}.${R2_ACCOUNT_HOST}`;

type SignPdfBody = {
  fileName?: unknown;
  fileSize?: unknown;
  contentType?: unknown;
};

function safeBaseName(fileName: string) {
  const raw = fileName.trim().split("/").pop()?.split("\\").pop() ?? "upload.pdf";
  const name = raw.replace(/\.[^.]+$/, "");
  const safe = name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 48);
  return safe || "upload";
}

function toPresignedUrl(
  hostname: string,
  path: string,
  query: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }
    params.append(key, value);
  });
  return `https://${hostname}${path}?${params.toString()}`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = (await req.json()) as SignPdfBody;
    const fileName = String(body.fileName ?? "").trim();
    const fileSize = Number(body.fileSize ?? 0);
    const contentType = String(body.contentType ?? "").trim().toLowerCase();

    if (!fileName) {
      return NextResponse.json({ error: "fileName이 필요합니다." }, { status: 400 });
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "fileSize가 올바르지 않습니다." }, { status: 400 });
    }
    if (fileSize > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: `파일이 너무 큽니다. 최대 ${(MAX_PDF_SIZE / 1024 / 1024).toFixed(0)}MB` },
        { status: 400 },
      );
    }

    const lowerName = fileName.toLowerCase();
    const isPdfType = contentType === "application/pdf" || lowerName.endsWith(".pdf");
    if (!isPdfType) {
      return NextResponse.json({ error: "PDF 파일만 업로드할 수 있습니다." }, { status: 400 });
    }

    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const key = `pdf-temp/${user.id}/${yyyy}/${mm}/${Date.now()}-${crypto.randomUUID()}-${safeBaseName(fileName)}.pdf`;

    const signer = new SignatureV4({
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
      region: "auto",
      service: "s3",
      sha256: Hash.bind(null, "sha256"),
      uriEscapePath: false,
    });

    const signed = await signer.presign(
      new HttpRequest({
        protocol: "https:",
        hostname: R2_BUCKET_HOST,
        method: "PUT",
        path: `/${key}`,
        headers: {
          host: R2_BUCKET_HOST,
          "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
        },
      }),
      { expiresIn: SIGN_EXPIRES_IN_SECONDS },
    );

    const uploadUrl = toPresignedUrl(
      R2_BUCKET_HOST,
      signed.path,
      signed.query as Record<string, string | string[] | undefined>,
    );
    const expiresAt = new Date(Date.now() + SIGN_EXPIRES_IN_SECONDS * 1000).toISOString();
    const publicUrl = `${R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`;

    return NextResponse.json({ uploadUrl, key, publicUrl, expiresAt });
  } catch (error) {
    console.error("POST /api/r2/upload/sign-pdf error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
