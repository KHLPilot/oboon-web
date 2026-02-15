// features/property/mappers/propertyProgress.ts

export type RelationRow = { id: number };

export type SpecsRow = {
  id: number;
  sale_type?: string | null;
  trust_company?: string | null;
  developer?: string | null;
  builder?: string | null;
  site_area?: number | null;
  building_area?: number | null;
  building_coverage_ratio?: number | null;
  floor_area_ratio?: number | null;
  floor_ground?: number | null;
  floor_underground?: number | null;
  building_count?: number | null;
  household_total?: number | null;
  parking_total?: number | null;
  parking_per_household?: number | null;
  heating_type?: string | null;
  amenities?: string | null;
};

export type TimelineRow = {
  id: number;
  announcement_date?: string | null;
  application_start?: string | null;
  application_end?: string | null;
  winner_announce?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  move_in_date?: string | null;
};

export type SectionStatus = "none" | "partial" | "full";

export type PropertyProgressRow = {
  property_locations?: RelationRow[] | null;
  property_facilities?: RelationRow[] | null;
  property_specs?: SpecsRow | SpecsRow[] | null;
  property_timeline?: TimelineRow | TimelineRow[] | null;
  property_unit_types?: RelationRow[] | null;
  confirmed_comment?: string | null;
  estimated_comment?: string | null;
};

function hasMany(v?: RelationRow[] | null) {
  return Array.isArray(v) && v.length > 0;
}

function statusFromValues(
  vals: (string | number | null | undefined)[],
): SectionStatus {
  const filled = vals.filter(
    (v) => v !== null && v !== undefined && v !== "",
  ).length;
  if (filled === 0) return "none";
  if (filled === vals.length) return "full";
  return "partial";
}

function getSpecsRow(row: PropertyProgressRow) {
  return Array.isArray(row.property_specs)
    ? row.property_specs[0]
    : (row.property_specs ?? null);
}

function getTimelineRow(row: PropertyProgressRow) {
  return Array.isArray(row.property_timeline)
    ? row.property_timeline[0]
    : (row.property_timeline ?? null);
}

export function getPropertySectionStatus(row: PropertyProgressRow) {
  const specsRow = getSpecsRow(row);
  const timelineRow = getTimelineRow(row);

  const siteLocationStatus: SectionStatus = hasMany(row.property_locations)
    ? "full"
    : "none";
  const facilityStatus: SectionStatus = hasMany(row.property_facilities)
    ? "full"
    : "none";
  const unitStatus: SectionStatus = hasMany(row.property_unit_types)
    ? "full"
    : "none";

  const specsStatus: SectionStatus = specsRow
    ? statusFromValues([
        specsRow.sale_type,
        specsRow.trust_company,
        specsRow.developer,
        specsRow.builder,
        specsRow.site_area,
        specsRow.building_area,
        specsRow.building_coverage_ratio,
        specsRow.floor_area_ratio,
        specsRow.floor_ground,
        specsRow.floor_underground,
        specsRow.building_count,
        specsRow.household_total,
        specsRow.parking_total,
        specsRow.parking_per_household,
        specsRow.heating_type,
        specsRow.amenities,
      ])
    : "none";

  const timelineStatus: SectionStatus = timelineRow
    ? statusFromValues([
        timelineRow.announcement_date,
        timelineRow.application_start,
        timelineRow.application_end,
        timelineRow.winner_announce,
        timelineRow.contract_start,
        timelineRow.contract_end,
        timelineRow.move_in_date,
      ])
    : "none";

  const commentStatus: SectionStatus = statusFromValues([
    row.confirmed_comment,
    row.estimated_comment,
  ]);

  const specsRequiredFields = [
    specsRow?.sale_type,
    specsRow?.developer,
    specsRow?.builder,
  ];
  const timelineRequiredFields = [
    timelineRow?.announcement_date,
    timelineRow?.application_start,
    timelineRow?.application_end,
    timelineRow?.contract_start,
  ];

  const specsRequiredMet = specsRequiredFields.every((v) => !!v);
  const timelineRequiredMet = timelineRequiredFields.every((v) => !!v);

  return {
    siteLocationStatus,
    facilityStatus,
    specsStatus,
    timelineStatus,
    unitStatus,
    commentStatus,
    specsRequiredMet,
    timelineRequiredMet,
  };
}

export function getPropertyProgress(row: PropertyProgressRow) {
  const {
    siteLocationStatus,
    facilityStatus,
    specsStatus,
    timelineStatus,
    unitStatus,
    commentStatus,
    specsRequiredMet,
    timelineRequiredMet,
  } = getPropertySectionStatus(row);

  const sections = [
    { label: "현장 위치", status: siteLocationStatus },
    { label: "건물 스펙", status: specsStatus, requiredMet: specsRequiredMet },
    { label: "일정", status: timelineStatus, requiredMet: timelineRequiredMet },
    { label: "평면 타입", status: unitStatus },
    { label: "홍보시설", status: facilityStatus },
    { label: "감정평가사 메모", status: commentStatus },
  ];

  const shouldCountSection = (status: SectionStatus, requiredMet?: boolean) =>
    status !== "none" && (requiredMet ?? true);

  const inputCount = sections.filter((s) =>
    shouldCountSection(s.status, s.requiredMet),
  ).length;
  const fullCount = sections.filter((s) => s.status === "full").length;
  const totalCount = sections.length;

  const missingLabels = sections
    .filter((s) => !shouldCountSection(s.status, s.requiredMet))
    .map((s) => s.label);

  return {
    siteLocationStatus,
    facilityStatus,
    specsStatus,
    timelineStatus,
    unitStatus,
    commentStatus,
    specsRequiredMet,
    timelineRequiredMet,
    inputCount,
    fullCount,
    totalCount,
    missingLabels,
    isIncomplete: missingLabels.length > 0,
  };
}

export function getPropertyProgressPercent(row: PropertyProgressRow) {
  const {
    siteLocationStatus,
    facilityStatus,
    specsStatus,
    timelineStatus,
    unitStatus,
    commentStatus,
  } = getPropertySectionStatus(row);

  const sections = [
    siteLocationStatus,
    specsStatus,
    timelineStatus,
    unitStatus,
    facilityStatus,
    commentStatus,
  ];

  const completedCount = sections.filter((s) => s === "full").length;
  const partialCount = sections.filter((s) => s === "partial").length;
  const percent = Math.round(
    ((completedCount + partialCount * 0.5) / sections.length) * 100,
  );

  return percent;
}
