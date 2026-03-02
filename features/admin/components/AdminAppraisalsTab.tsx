"use client";

import { AlertTriangle, Loader2, RefreshCw, Search } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import NaverMap, { type MapMarker } from "@/features/map/components/NaverMap";
import { appraisalKindLabel } from "@/features/admin/lib/dashboard-labels";
import type { AppraisalKind, AppraisalResultRow } from "@/features/admin/types/dashboard";
import { AdminTableShell, AdminTd, AdminTh } from "@/features/admin/components/AdminTable";

type AdminAppraisalsTabProps = {
  onRefresh: () => void;
  appraisalAddressQuery: string;
  onChangeAddressQuery: (value: string) => void;
  appraisalRadiusM: string;
  onChangeRadiusM: (value: string) => void;
  appraisalLimit: string;
  onChangeLimit: (value: string) => void;
  appraisalTypes: Record<AppraisalKind, boolean>;
  onToggleType: (kind: AppraisalKind) => void;
  onSearchNearby: () => void;
  appraisalLoading: boolean;
  appraisalResolvedRoadAddress: string | null;
  appraisalResolvedJibunAddress: string | null;
  appraisalResolvedLat: number | null;
  appraisalResolvedLng: number | null;
  hasNaverMapClientId: boolean;
  appraisalMapMarkers: MapMarker[];
  focusedAppraisalMarkerId: number | null;
  onMarkerSelect: (markerId: number) => void;
  appraisalRows: AppraisalResultRow[];
  selectedAppraisalRowId: string | null;
  onSelectRow: (rowId: string) => void;
  appraisalWarnings: string[];
  appraisalFetchedAt: string | null;
};

export default function AdminAppraisalsTab({
  onRefresh,
  appraisalAddressQuery,
  onChangeAddressQuery,
  appraisalRadiusM,
  onChangeRadiusM,
  appraisalLimit,
  onChangeLimit,
  appraisalTypes,
  onToggleType,
  onSearchNearby,
  appraisalLoading,
  appraisalResolvedRoadAddress,
  appraisalResolvedJibunAddress,
  appraisalResolvedLat,
  appraisalResolvedLng,
  hasNaverMapClientId,
  appraisalMapMarkers,
  focusedAppraisalMarkerId,
  onMarkerSelect,
  appraisalRows,
  selectedAppraisalRowId,
  onSelectRow,
  appraisalWarnings,
  appraisalFetchedAt,
}: AdminAppraisalsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="ob-typo-h2 text-(--oboon-text-title)">감정평가</div>
          <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            카카오 지도 기반으로 근방 아파트/오피스텔을 찾고 상세 정보를 매칭합니다.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          className="h-9 w-9 p-0 rounded-full"
          onClick={onRefresh}
          aria-label="새로고침"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card className="p-4 shadow-none">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2 lg:col-span-2">
            <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
              기준 주소 (도로명 / 지번)
            </label>
            <Input
              value={appraisalAddressQuery}
              onChange={(e) => onChangeAddressQuery(e.target.value)}
              placeholder="예: 서울특별시 강남구 테헤란로 212 또는 강남구 역삼동 719"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                onSearchNearby();
              }}
            />
          </div>
          <div>
            <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
              반경 (m)
            </label>
            <Input
              value={appraisalRadiusM}
              onChange={(e) => onChangeRadiusM(e.target.value)}
              placeholder="1000"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="mb-1 block ob-typo-caption text-(--oboon-text-muted)">
              최대 건수
            </label>
            <Input
              value={appraisalLimit}
              onChange={(e) => onChangeLimit(e.target.value)}
              placeholder="30"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(["apartment", "officetel"] as AppraisalKind[]).map((kind) => (
              <Button
                key={kind}
                type="button"
                size="sm"
                shape="pill"
                variant={appraisalTypes[kind] ? "primary" : "secondary"}
                onClick={() => onToggleType(kind)}
              >
                {appraisalKindLabel(kind)}
              </Button>
            ))}
          </div>
          <Button
            variant="primary"
            size="sm"
            shape="pill"
            onClick={onSearchNearby}
            loading={appraisalLoading}
          >
            <Search className="h-4 w-4" />
            근방 검색
          </Button>
        </div>

        {appraisalResolvedLat !== null && appraisalResolvedLng !== null ? (
          <div className="mt-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2">
            <p className="ob-typo-caption text-(--oboon-text-muted)">
              해석 주소: {appraisalResolvedRoadAddress ?? appraisalResolvedJibunAddress ?? appraisalAddressQuery}
            </p>
            <p className="ob-typo-caption text-(--oboon-text-muted)">
              좌표: {appraisalResolvedLat.toFixed(6)}, {appraisalResolvedLng.toFixed(6)}
            </p>
          </div>
        ) : null}

        <p className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
          현재는 카카오 검색 결과와 내부 데이터 매칭 기준으로 제공합니다.
        </p>
      </Card>

      <Card className="p-4 shadow-none">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="ob-typo-subtitle text-(--oboon-text-title)">지도</div>
            <Badge variant="status">{appraisalMapMarkers.length}개 마커</Badge>
          </div>
          <div className="ob-typo-caption text-(--oboon-text-muted)">기본 마커 표시 중</div>
        </div>

        {!hasNaverMapClientId ? (
          <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-6 text-center">
            <p className="ob-typo-body text-(--oboon-text-muted)">
              <code>NEXT_PUBLIC_NAVER_MAP_CLIENT_ID</code>가 설정되지 않아 지도를 표시할 수 없습니다.
            </p>
          </div>
        ) : appraisalMapMarkers.length === 0 ? (
          <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) p-6 text-center">
            <p className="ob-typo-body text-(--oboon-text-muted)">
              먼저 근방 검색을 실행하면 지도에 기본 마커가 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-(--oboon-border-default)">
            <NaverMap
              markers={appraisalMapMarkers}
              focusedId={focusedAppraisalMarkerId}
              showFocusedAsRich={false}
              fitToMarkers
              regionClusterEnabled={false}
              onMarkerSelect={onMarkerSelect}
            />
          </div>
        )}
      </Card>

      <Card className="p-4 shadow-none">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="ob-typo-subtitle text-(--oboon-text-title)">검색 결과</div>
            <Badge variant="status">{appraisalRows.length}건</Badge>
          </div>
          <div className="ob-typo-caption text-(--oboon-text-muted)">
            {appraisalFetchedAt
              ? `최근 조회: ${new Date(appraisalFetchedAt).toLocaleString("ko-KR")}`
              : "최근 조회: -"}
          </div>
        </div>

        {appraisalWarnings.length > 0 ? (
          <div className="mb-3 space-y-1">
            {appraisalWarnings.map((warning, index) => (
              <div
                key={`${warning}-${index}`}
                className="flex items-center gap-1.5 ob-typo-caption text-(--oboon-warning-text)"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        ) : null}

        {appraisalLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-(--oboon-primary)" />
          </div>
        ) : appraisalRows.length === 0 ? (
          <div className="py-8 text-center ob-typo-body text-(--oboon-text-muted)">
            조건에 맞는 결과가 없습니다.
          </div>
        ) : (
          <AdminTableShell>
            <thead>
              <tr>
                <AdminTh>유형 / 시설명</AdminTh>
                <AdminTh>위치</AdminTh>
                <AdminTh>단지</AdminTh>
                <AdminTh>출처</AdminTh>
              </tr>
            </thead>
            <tbody>
              {appraisalRows.map((row) => (
                <tr
                  key={row.id}
                  className={[
                    "cursor-pointer transition-colors",
                    selectedAppraisalRowId === row.id
                      ? "bg-(--oboon-bg-subtle)"
                      : "hover:bg-(--oboon-bg-subtle)/70",
                  ].join(" ")}
                  onClick={() => onSelectRow(row.id)}
                >
                  <AdminTd>
                    <div className="space-y-1">
                      <Badge variant="status">{appraisalKindLabel(row.kind)}</Badge>
                      <div className="ob-typo-body text-(--oboon-text-title)">{row.name}</div>
                      {row.place_url ? (
                        <a
                          href={row.place_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ob-typo-caption text-(--oboon-primary) hover:underline"
                        >
                          카카오 장소 보기
                        </a>
                      ) : null}
                    </div>
                  </AdminTd>
                  <AdminTd>
                    <div className="space-y-1">
                      <div>{row.road_address ?? row.jibun_address ?? "-"}</div>
                      <div className="ob-typo-caption text-(--oboon-text-muted)">
                        {row.distance_m !== null ? `${row.distance_m}m` : "거리 정보 없음"}
                      </div>
                    </div>
                  </AdminTd>
                  <AdminTd>
                    <div className="space-y-1">
                      <div>{row.detail.complex_name ?? "-"}</div>
                      {row.detail.matched_property_id ? (
                        <div className="ob-typo-caption text-(--oboon-text-muted)">
                          내부 ID #{row.detail.matched_property_id}
                        </div>
                      ) : null}
                    </div>
                  </AdminTd>
                  <AdminTd>
                    <div className="flex flex-wrap gap-1">
                      {row.detail.source.kakao ? <Badge variant="status">Kakao</Badge> : null}
                      {row.detail.source.internal_db ? (
                        <Badge variant="success">내부DB</Badge>
                      ) : null}
                      {row.detail.source.public_data ? (
                        <Badge variant="success">공공데이터</Badge>
                      ) : null}
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTableShell>
        )}
      </Card>
    </div>
  );
}
