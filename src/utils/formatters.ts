/**
 * 시각을 한국 표준시(Asia/Seoul, KST) 형식으로 변환합니다.
 * '한국시간 KST' 문구를 명시합니다.
 */
export function formatKST(timestamp: number | null | undefined): string {
  if (timestamp === null || timestamp === undefined || isNaN(timestamp)) {
    return '시각 정보 없음';
  }
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '시각 정보 없음';
    }
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return `${formatter.format(date)} (한국시간 KST)`;
  } catch {
    return '시각 형식 변환 오류';
  }
}

/**
 * 상세 페이지 URL이 안전한 USGS 공식 HTTPS 주소인지 검증합니다.
 */
export function isValidUsgsUrl(urlStr: unknown): boolean {
  if (typeof urlStr !== 'string' || !urlStr.trim()) {
    return false;
  }
  try {
    const parsed = new URL(urlStr.trim());
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'earthquake.usgs.gov' ||
        parsed.hostname.endsWith('.earthquake.usgs.gov'))
    );
  } catch {
    return false;
  }
}

/**
 * 숫자 표기 유틸리티 (null을 0으로 바꾸지 않고 '기록 없음' 처리)
 */
export function formatNumberOrNull(
  val: number | null | undefined,
  unit: string = '',
  decimals?: number
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '기록 없음';
  }
  const formatted = decimals !== undefined ? val.toFixed(decimals) : val.toString();
  return unit ? `${formatted} ${unit}` : formatted;
}
