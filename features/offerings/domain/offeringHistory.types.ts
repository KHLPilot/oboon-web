export interface OfferingViewHistoryRow {
  id: number;
  profileId: string;
  propertyId: number;
  lastViewedAt: string;
  viewCount: number;
}

/** localStorage에 저장되는 비로그인 히스토리 항목 */
export interface LocalViewHistoryItem {
  propertyId: number;
  lastViewedAt: string;
}
