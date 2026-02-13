import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { propertyExtractionSchema } from '@/lib/schema/property-schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const MAX_TEXT_LENGTH = 30000;

const systemPrompt = `너는 대한민국 아파트/오피스텔 분양 사업개요(모집공고문) PDF에서 정형 데이터를 추출하는 전문가다.

## 규칙
1. PDF 텍스트에 명시된 값만 추출하라. 추측 금지.
2. 찾을 수 없는 값은 반드시 null로 반환하라.
3. 숫자는 반드시 숫자 타입으로 반환하라 (문자열 금지).
4. 면적은 m2(제곱미터) 단위 숫자로 통일하라.
5. 분양가는 만원 단위 숫자로 반환하라. (예: 5억 3천만원 → 53000)
6. 날짜는 YYYY-MM-DD 형식으로 반환하라. (예: 2025.03.15 → 2025-03-15)
7. 입주 예정일(move_in_date)은 정확한 날짜가 없으면 텍스트 그대로 반환하라. (예: "2027년 3월 예정")

## 추출 대상 필드 안내
- properties.name: 단지명/현장명 (예: "힐스테이트 OO", "더샵 OO")
- properties.property_type: "아파트", "오피스텔", "주상복합", "상업시설" 등
- location: 소재지 주소에서 도로명/지번/행정구역 분리
- specs.developer: 시행사 / 사업주체
- specs.builder: 시공사
- specs.trust_company: 신탁사 / 관리형 신탁사
- timeline: 모집공고일, 청약접수 시작/마감, 당첨자발표, 계약 시작/종료, 입주 예정
- unit_types: 주택형(타입)별 면적, 세대수, 분양가 (최소~최대를 만원 단위로)
- facilities: 인근 학교/교통/편의시설 (type으로 분류: 교육, 교통, 의료, 편의, 공원 등)`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return Response.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const nonPdf = files.find((f) => f.type !== 'application/pdf');
    if (nonPdf) {
      return Response.json({ error: `PDF 파일만 업로드 가능합니다: ${nonPdf.name}` }, { status: 400 });
    }

    const textParts: string[] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parsed = await pdfParse(buffer);
      if (parsed.text?.trim()) {
        textParts.push(`=== [${file.name}] ===\n${parsed.text}`);
      }
    }

    if (textParts.length === 0) {
      return Response.json(
        { error: 'PDF에서 텍스트를 추출하지 못했습니다. 스캔된 이미지 PDF는 지원하지 않습니다.' },
        { status: 400 }
      );
    }

    const rawText = textParts.join('\n\n');
    const truncated = rawText.length > MAX_TEXT_LENGTH;
    const extractedText = truncated
      ? rawText.slice(0, MAX_TEXT_LENGTH) + '\n\n[... 텍스트가 길어서 일부만 분석합니다]'
      : rawText;

    const { object } = await generateObject({
      model: google('gemini-2.5-flash-lite'),
      schema: propertyExtractionSchema,
      system: systemPrompt,
      prompt: `다음은 동일 분양 현장의 PDF ${files.length}개에서 추출한 텍스트다. 모든 문서의 정보를 종합하여 하나의 정형 데이터로 변환하라.\n\n${extractedText}`,
    });

    return Response.json({
      ...object,
      _meta: {
        fileCount: files.length,
        textLength: rawText.length,
        truncated,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '분석 중 오류 발생';
    console.error('AI Extraction Error:', error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ status: 'extract-pdf API 정상 동작 중' });
}
