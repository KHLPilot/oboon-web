'use client';

import { useState } from 'react';
import type { PropertyExtractionData } from '@/lib/schema/property-schema';

type ExtractResult = PropertyExtractionData & {
  location: PropertyExtractionData['location'] & { lat?: number | null; lng?: number | null };
  _meta?: { fileCount: number; textLength: number; truncated: boolean; geocoded: boolean };
};

const STATUS_LABEL: Record<string, string> = {
  READY: '분양 예정',
  OPEN: '분양 중',
  CLOSED: '분양 종료',
};

export default function TestUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);

  const handleSubmit = async () => {
    if (files.length === 0) {
      setStatus('파일을 선택해주세요.');
      return;
    }

    setStatus(`PDF ${files.length}개 분석 중... (최대 60초 소요)`);
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    try {
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `서버 에러: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      setStatus('추출 완료!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      setStatus(`오류: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const val = (v: unknown) => (v != null && v !== '' ? String(v) : '-');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>OBOON AI 데이터 추출 테스트</h1>

      <div style={{ border: '2px dashed #00aa00', padding: '2rem', borderRadius: 12, textAlign: 'center' }}>
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
          style={{ marginBottom: '1rem' }}
        />
        {files.length > 0 && (
          <p style={{ color: '#555', fontSize: '0.85rem', margin: '0.5rem 0' }}>
            {files.map((f) => f.name).join(', ')} ({files.length}개)
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={files.length === 0 || loading}
          style={{
            background: files.length === 0 || loading ? 'gray' : '#0070f3',
            color: 'white',
            padding: '0.8rem 1.5rem',
            border: 'none',
            borderRadius: 8,
            cursor: files.length === 0 || loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          {loading ? '분석 중...' : `데이터 추출 시작 (${files.length}개 PDF)`}
        </button>
        <p style={{ marginTop: '1rem', color: status.includes('오류') ? 'red' : 'green', fontWeight: 'bold' }}>
          {status}
        </p>
      </div>

      {result && (
        <div style={{ marginTop: '2rem' }}>
          {result._meta && (
            <p style={{ color: '#888', fontSize: '0.85rem' }}>
              PDF {result._meta.fileCount}개 / 텍스트 {result._meta.textLength.toLocaleString()}자
              {result._meta.truncated && ' (일부만 분석됨)'}
              {result._meta.geocoded && ' / 지오코딩 완료'}
            </p>
          )}

          <Section title="기본 정보">
            <Row label="현장명" value={val(result.properties?.name)} />
            <Row label="분양 유형" value={val(result.properties?.property_type)} />
            <Row label="분양 상태" value={result.properties?.status ? STATUS_LABEL[result.properties.status] ?? result.properties.status : '-'} />
            <Row label="설명" value={val(result.properties?.description)} />
          </Section>

          <Section title="위치">
            <Row label="도로명 주소" value={val(result.location?.road_address)} />
            <Row label="지번 주소" value={val(result.location?.jibun_address)} />
            <Row label="지역" value={
              [result.location?.region_1depth, result.location?.region_2depth, result.location?.region_3depth]
                .filter(Boolean).join(' ') || '-'
            } />
            <Row label="위도" value={val(result.location?.lat)} />
            <Row label="경도" value={val(result.location?.lng)} />
          </Section>

          <Section title="사업 개요">
            <Row label="시행사" value={val(result.specs?.developer)} />
            <Row label="시공사" value={val(result.specs?.builder)} />
            <Row label="신탁사" value={val(result.specs?.trust_company)} />
            <Row label="분양 방식" value={val(result.specs?.sale_type)} />
            <Row label="용도지역" value={val(result.specs?.land_use_zone)} />
            <Row label="대지면적" value={result.specs?.site_area != null ? `${result.specs.site_area} m²` : '-'} />
            <Row label="건축면적" value={result.specs?.building_area != null ? `${result.specs.building_area} m²` : '-'} />
            <Row label="규모" value={
              result.specs?.floor_underground != null || result.specs?.floor_ground != null
                ? `지하 ${result.specs?.floor_underground ?? '?'}층 / 지상 ${result.specs?.floor_ground ?? '?'}층`
                : '-'
            } />
            <Row label="동 수" value={val(result.specs?.building_count)} />
            <Row label="총 세대수" value={val(result.specs?.household_total)} />
            <Row label="주차" value={
              result.specs?.parking_total != null
                ? `${result.specs.parking_total}대${result.specs.parking_per_household != null ? ` (세대당 ${result.specs.parking_per_household}대)` : ''}`
                : '-'
            } />
            <Row label="난방" value={val(result.specs?.heating_type)} />
            <Row label="용적률" value={result.specs?.floor_area_ratio != null ? `${result.specs.floor_area_ratio}%` : '-'} />
            <Row label="건폐율" value={result.specs?.building_coverage_ratio != null ? `${result.specs.building_coverage_ratio}%` : '-'} />
            <Row label="부대시설" value={val(result.specs?.amenities)} />
          </Section>

          <Section title="일정">
            <Row label="모집공고일" value={val(result.timeline?.announcement_date)} />
            <Row label="청약 접수" value={
              result.timeline?.application_start || result.timeline?.application_end
                ? `${val(result.timeline?.application_start)} ~ ${val(result.timeline?.application_end)}`
                : '-'
            } />
            <Row label="당첨자 발표" value={val(result.timeline?.winner_announce)} />
            <Row label="계약 기간" value={
              result.timeline?.contract_start || result.timeline?.contract_end
                ? `${val(result.timeline?.contract_start)} ~ ${val(result.timeline?.contract_end)}`
                : '-'
            } />
            <Row label="입주 예정" value={val(result.timeline?.move_in_date)} />
          </Section>

          {result.unit_types && result.unit_types.length > 0 && (
            <Section title="주택형 (타입)">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    {['타입', '전용(m²)', '공급(m²)', '방', '욕실', '분양가(만원)', '세대수'].map((h) => (
                      <th key={h} style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.unit_types.map((u, i) => (
                    <tr key={i}>
                      <td style={cellStyle}>{val(u.type_name)}</td>
                      <td style={cellStyle}>{val(u.exclusive_area)}</td>
                      <td style={cellStyle}>{val(u.supply_area)}</td>
                      <td style={cellStyle}>{val(u.rooms)}</td>
                      <td style={cellStyle}>{val(u.bathrooms)}</td>
                      <td style={cellStyle}>
                        {u.price_min != null || u.price_max != null
                          ? `${u.price_min?.toLocaleString() ?? '?'} ~ ${u.price_max?.toLocaleString() ?? '?'}`
                          : '-'}
                      </td>
                      <td style={cellStyle}>{val(u.unit_count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {result.facilities && result.facilities.length > 0 && (
            <Section title="홍보시설">
              {result.facilities.map((f, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 600 }}>[{f.type}] {f.name}</div>
                  {f.road_address && <div style={{ color: '#666', fontSize: '0.85rem' }}>주소: {f.road_address}</div>}
                  {(f.open_start || f.open_end) && (
                    <div style={{ color: '#666', fontSize: '0.85rem' }}>
                      운영시간: {f.open_start ?? '?'} ~ {f.open_end ?? '?'}
                    </div>
                  )}
                </div>
              ))}
            </Section>
          )}

          <details style={{ marginTop: '1.5rem' }}>
            <summary style={{ cursor: 'pointer', color: '#666' }}>원본 JSON 보기</summary>
            <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 8, overflow: 'auto', fontSize: '0.8rem' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid #ddd',
  textAlign: 'center',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h2 style={{ fontSize: '1.1rem', borderBottom: '2px solid #0070f3', paddingBottom: 4, marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ width: 120, fontWeight: 600, color: '#555', flexShrink: 0 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
