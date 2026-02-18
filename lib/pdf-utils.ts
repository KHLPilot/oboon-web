import { getDocumentProxy, extractImages, renderPageAsImage } from 'unpdf';

export interface ExtractedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: 'jpeg' | 'png';
}

export interface ImageExtractionStats {
  totalPages: number;
  imagesFound: number;
  imagesExtracted: number;
  imagesFailed: number;
  renderFallbackUsed: boolean;
}

const MAX_IMAGES = 20;
const MAX_DIMENSION = 1280;
const MAX_RENDERED_PAGES = 10;

/**
 * Raw pixel data를 리사이즈 후 JPEG Buffer로 변환합니다.
 */
async function pixelDataToJpegBuffer(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  channels: number
): Promise<{ buffer: Buffer; outWidth: number; outHeight: number }> {
  const { createCanvas, ImageData } = await import('@napi-rs/canvas');

  // RGBA 데이터로 변환
  let rgbaData: Uint8ClampedArray;

  if (channels === 4) {
    rgbaData = data;
  } else if (channels === 3) {
    rgbaData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      rgbaData[i * 4] = data[i * 3];
      rgbaData[i * 4 + 1] = data[i * 3 + 1];
      rgbaData[i * 4 + 2] = data[i * 3 + 2];
      rgbaData[i * 4 + 3] = 255;
    }
  } else {
    rgbaData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      rgbaData[i * 4] = data[i];
      rgbaData[i * 4 + 1] = data[i];
      rgbaData[i * 4 + 2] = data[i];
      rgbaData[i * 4 + 3] = 255;
    }
  }

  // 리사이즈 비율 계산
  let targetWidth = width;
  let targetHeight = height;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    targetWidth = Math.round(width * scale);
    targetHeight = Math.round(height * scale);
  }

  // 원본 canvas에 pixel data 넣기
  const srcCanvas = createCanvas(width, height);
  const srcCtx = srcCanvas.getContext('2d');
  const imageData = new ImageData(rgbaData, width, height);
  srcCtx.putImageData(imageData, 0, 0);

  // 축소 canvas에 drawImage
  const destCanvas = createCanvas(targetWidth, targetHeight);
  const destCtx = destCanvas.getContext('2d');
  destCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);

  return {
    buffer: destCanvas.toBuffer('image/jpeg'),
    outWidth: targetWidth,
    outHeight: targetHeight,
  };
}

/**
 * PDF에서 임베디드 이미지를 추출합니다.
 * @param pdfBuffer PDF 파일의 Buffer
 * @returns 추출된 이미지 배열 및 통계 정보
 */
export async function extractImagesFromPDF(
  pdfBuffer: Buffer
): Promise<{ images: ExtractedImage[]; stats: ImageExtractionStats }> {
  const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
  const images: ExtractedImage[] = [];

  const stats: ImageExtractionStats = {
    totalPages: pdf.numPages,
    imagesFound: 0,
    imagesExtracted: 0,
    imagesFailed: 0,
    renderFallbackUsed: false,
  };

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    if (images.length >= MAX_IMAGES) break;

    try {
      const pageImages = await extractImages(pdf, pageNum);

      for (const img of pageImages) {
        if (images.length >= MAX_IMAGES) break;
        stats.imagesFound++;

        // 휴리스틱 필터: 작은 이미지, 극단적 비율 제외
        if (img.width < 300 || img.height < 200) continue;
        const ratio = img.width / img.height;
        if (ratio > 5 || ratio < 0.2) continue;
        if (img.width * img.height < 120000) continue;

        try {
          const { buffer, outWidth, outHeight } = await pixelDataToJpegBuffer(
            img.data,
            img.width,
            img.height,
            img.channels
          );

          images.push({
            buffer,
            width: outWidth,
            height: outHeight,
            format: 'jpeg',
          });

          stats.imagesExtracted++;
        } catch (error) {
          stats.imagesFailed++;
          console.warn(
            `[PDF 이미지 추출] 페이지 ${pageNum}: 이미지 변환 실패`,
            error
          );
        }
      }
    } catch (error) {
      console.warn(
        `[PDF 이미지 추출] 페이지 ${pageNum}: 이미지 추출 실패`,
        error
      );
    }
  }

  return { images, stats };
}

/**
 * PDF 페이지를 이미지로 렌더링합니다 (벡터 평면도 캡처용).
 * 각 페이지를 1280px 너비의 PNG data URL로 반환합니다.
 */
export async function renderPagesAsImages(
  pdfBuffer: Buffer
): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
  const dataUrls: string[] = [];
  const pageCount = Math.min(pdf.numPages, MAX_RENDERED_PAGES);

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    try {
      const dataUrl = await renderPageAsImage(pdf, pageNum, {
        canvasImport: () => import('@napi-rs/canvas'),
        width: 1280,
        toDataURL: true,
      });
      dataUrls.push(dataUrl as string);
    } catch (error) {
      console.warn(`[PDF 렌더링] 페이지 ${pageNum}: 렌더링 실패`, error);
    }
  }

  return dataUrls;
}

/**
 * Buffer를 base64 데이터 URL로 변환합니다.
 */
export function convertImageToBase64(buffer: Buffer, format: string): string {
  return `data:image/${format};base64,${buffer.toString('base64')}`;
}
