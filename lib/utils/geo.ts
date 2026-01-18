/**
 * 지리적 유틸리티 함수
 */

/**
 * Haversine 공식을 사용한 두 좌표 간 거리 계산 (미터 단위)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // 지구 반경 (미터)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * 주어진 좌표가 기준점으로부터 특정 반경 내에 있는지 확인
 */
export function isWithinRadius(
  targetLat: number,
  targetLng: number,
  baseLat: number,
  baseLng: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(targetLat, targetLng, baseLat, baseLng);
  return distance <= radiusMeters;
}
