import { NextResponse } from "next/server";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
const PREFIX = "pdf-temp/";

function isAuthorized(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false; // CRON_SECRET 미설정 시 항상 거부
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

function toPositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const ttlHours = toPositiveInt(
      searchParams.get("ttlHours"),
      toPositiveInt(process.env.TEMP_PDF_TTL_HOURS ?? null, 24),
    );
    const dryRun = searchParams.get("dryRun") === "true";

    const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);
    let continuationToken: string | undefined;
    let scanned = 0;
    let candidates = 0;
    let deleted = 0;
    const deleteErrors: string[] = [];

    do {
      const list = await r2.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: PREFIX,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        }),
      );

      const objects = list.Contents ?? [];
      scanned += objects.length;

      const staleKeys = objects
        .filter((obj) => obj.Key && obj.LastModified && obj.LastModified < cutoff)
        .map((obj) => obj.Key as string);

      candidates += staleKeys.length;

      if (!dryRun && staleKeys.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < staleKeys.length; i += 1000) {
          chunks.push(staleKeys.slice(i, i + 1000));
        }

        for (const chunk of chunks) {
          const result = await r2.send(
            new DeleteObjectsCommand({
              Bucket: BUCKET,
              Delete: {
                Objects: chunk.map((Key) => ({ Key })),
                Quiet: true,
              },
            }),
          );

          deleted += chunk.length - (result.Errors?.length ?? 0);
          (result.Errors ?? []).forEach((error) => {
            deleteErrors.push(`${error.Key ?? "unknown"}: ${error.Message ?? "delete failed"}`);
          });
        }
      }

      continuationToken = list.IsTruncated
        ? list.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return NextResponse.json({
      success: true,
      dryRun,
      ttlHours,
      cutoff: cutoff.toISOString(),
      scanned,
      candidates,
      deleted,
      deleteErrors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "cleanup_temp_pdfs_failed",
        details: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
