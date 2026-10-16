/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { EarthquakeMap } from './components/EarthquakeMap';
import { MapLegend } from './components/MapLegend';
import { FilterBar } from './components/FilterBar';
import { EarthquakeSummary } from './components/EarthquakeSummary';
import { EarthquakeList } from './components/EarthquakeList';
import {
  Globe,
  RefreshCw,
  AlertTriangle,
  Info,
  Clock,
  Compass,
  Database,
  ExternalLink,
  Activity,
  MapPin,
  BookOpen,
  GitBranch,
  List,
  Map as MapIcon,
} from 'lucide-react';
import {
  UsgsGeoJsonResponse,
  ValidatedEarthquake,
  FetchStatus,
  PeriodOption,
  DepthFilterOption,
  FilterState,
} from './types/earthquake';
import {
  PlateBoundaryFeatureCollection,
  PlateBoundaryFilters,
} from './types/plateBoundary';
import { formatKST, isValidUsgsUrl } from './utils/formatters';
import { getDepthClassification } from './utils/earthquakeStyling';
import {
  fetchAllPlateBoundaries,
  USGS_PLATE_BOUNDARIES_SERVICE_URL,
} from './utils/plateBoundaryService';

const PERIOD_URLS: Record<PeriodOption, string> = {
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson',
};

const PERIOD_LABELS: Record<PeriodOption, string> = {
  day: 'USGS 최근 24시간 · 규모 2.5 이상 자료',
  week: 'USGS 최근 7일 · 규모 2.5 이상 자료',
  month: 'USGS 최근 30일 · 규모 2.5 이상 자료',
};

interface CacheEntry {
  earthquakes: ValidatedEarthquake[];
  generatedTime: number | null;
  fetchedAt: number;
  totalFeedCount: number;
  invalidCoordsCount: number;
  nonEarthquakeCount: number;
}

export default function App() {
  // 지진 필터 상태 (기본값: 최근 7일, 최소 규모 2.5, 깊이 전체)
  const [filters, setFilters] = useState<FilterState>({
    period: 'week',
    minMagnitude: 2.5,
    depth: 'all',
  });

  // 판 경계 레이어 상태 (기본값: 끄기)
  const [plateFilters, setPlateFilters] = useState<PlateBoundaryFilters>({
    enabled: false,
    convergent: true,
    divergent: true,
    transform: true,
    other: true,
  });

  // 모바일 화면 탭 상태 ('map' | 'list')
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

  // 판 경계 데이터 저장소 (최초 1회 로드 후 재사용)
  const [plateData, setPlateData] = useState<PlateBoundaryFeatureCollection | null>(null);
  const [plateLoading, setPlateLoading] = useState<boolean>(false);
  const [plateError, setPlateError] = useState<string | null>(null);

  // 지진 데이터 상태
  const [rawPeriodEarthquakes, setRawPeriodEarthquakes] = useState<ValidatedEarthquake[]>([]);
  const [selectedEarthquake, setSelectedEarthquake] = useState<ValidatedEarthquake | null>(null);

  // 피드 로딩/에러 상태
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 시각 정보
  const [dataGeneratedTime, setDataGeneratedTime] = useState<number | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  // 집계 통계
  const [totalFeedCount, setTotalFeedCount] = useState<number>(0);
  const [invalidCoordsCount, setInvalidCoordsCount] = useState<number>(0);
  const [nonEarthquakeCount, setNonEarthquakeCount] = useState<number>(0);

  // 기간별 응답 캐시 저장소
  const cacheRef = useRef<Map<PeriodOption, CacheEntry>>(new Map());

  // 경쟁 상태 방지 ref
  const activeRequestIdRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  /**
   * 지정된 기간의 USGS 지진 피드 수신
   */
  const loadPeriodData = useCallback(async (period: PeriodOption, forceFresh: boolean = false) => {
    if (!forceFresh && cacheRef.current.has(period)) {
      const cached = cacheRef.current.get(period)!;
      setRawPeriodEarthquakes(cached.earthquakes);
      setDataGeneratedTime(cached.generatedTime);
      setLastFetchedAt(cached.fetchedAt);
      setTotalFeedCount(cached.totalFeedCount);
      setInvalidCoordsCount(cached.invalidCoordsCount);
      setNonEarthquakeCount(cached.nonEarthquakeCount);
      setFetchStatus('success');
      setErrorMessage(null);
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    isFetchingRef.current = true;
    setFetchStatus('loading');
    setErrorMessage(null);

    const url = PERIOD_URLS[period];

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`USGS 서버 응답 오류 (HTTP ${response.status} ${response.statusText})`);
      }

      const data: UsgsGeoJsonResponse = await response.json();

      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      const fetchTime = Date.now();
      const generated = data?.metadata?.generated ?? null;
      const features = Array.isArray(data?.features) ? data.features : [];

      let invalidCoordCounter = 0;
      let nonEqCounter = 0;
      const validList: ValidatedEarthquake[] = [];

      for (let i = 0; i < features.length; i++) {
        const feat = features[i];
        const props = feat?.properties;
        const geom = feat?.geometry;

        if (props?.type !== 'earthquake') {
          nonEqCounter++;
          continue;
        }

        const coords = geom?.coordinates;
        if (!coords || !Array.isArray(coords) || coords.length < 2) {
          invalidCoordCounter++;
          continue;
        }

        const lng = coords[0];
        const lat = coords[1];
        const depthRaw = coords.length >= 3 ? coords[2] : null;
        const depthKm = typeof depthRaw === 'number' && !isNaN(depthRaw) ? depthRaw : null;

        if (
          typeof lat !== 'number' ||
          isNaN(lat) ||
          lat < -90 ||
          lat > 90 ||
          typeof lng !== 'number' ||
          isNaN(lng) ||
          lng < -180 ||
          lng > 180
        ) {
          invalidCoordCounter++;
          continue;
        }

        const mag = typeof props.mag === 'number' && !isNaN(props.mag) ? props.mag : null;
        const id = feat.id ? String(feat.id) : `eq-${lat}-${lng}-${i}`;

        validList.push({
          id,
          lat,
          lng,
          depthKm,
          magnitude: mag,
          magType: props.magType || null,
          place: props.place || null,
          time: typeof props.time === 'number' && !isNaN(props.time) ? props.time : null,
          url: props.url || null,
          rawFeature: feat,
        });
      }

      const entry: CacheEntry = {
        earthquakes: validList,
        generatedTime: generated,
        fetchedAt: fetchTime,
        totalFeedCount: features.length,
        invalidCoordsCount: invalidCoordCounter,
        nonEarthquakeCount: nonEqCounter,
      };
      cacheRef.current.set(period, entry);

      setRawPeriodEarthquakes(validList);
      setDataGeneratedTime(generated);
      setLastFetchedAt(fetchTime);
      setTotalFeedCount(features.length);
      setInvalidCoordsCount(invalidCoordCounter);
      setNonEarthquakeCount(nonEqCounter);
      setFetchStatus('success');
    } catch (err) {
      if (requestId !== activeRequestIdRef.current) return;
      setRawPeriodEarthquakes([]);
      setFetchStatus('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'USGS 지진 데이터 피드를 가져오는 중 네트워크 오류가 발생했습니다.'
      );
    } finally {
      if (requestId === activeRequestIdRef.current) {
        isFetchingRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    loadPeriodData(filters.period, false);
  }, [filters.period, loadPeriodData]);

  /**
   * 판 경계 데이터 수신 (최초 1회 로드 후 재사용)
   */
  const loadPlateBoundaries = useCallback(async () => {
    if (plateData !== null || plateLoading) return;

    setPlateLoading(true);
    setPlateError(null);

    try {
      const data = await fetchAllPlateBoundaries();
      setPlateData(data);
    } catch (err) {
      setPlateError(
        err instanceof Error ? err.message : 'USGS 판 경계 레이어를 불러오지 못했습니다.'
      );
    } finally {
      setPlateLoading(false);
    }
  }, [plateData, plateLoading]);

  const handleTogglePlateBoundary = (enabled: boolean) => {
    setPlateFilters((prev) => ({ ...prev, enabled }));
    if (enabled && plateData === null) {
      loadPlateBoundaries();
    }
  };

  const handleToggleBoundaryType = (
    type: 'convergent' | 'divergent' | 'transform' | 'other',
    checked: boolean
  ) => {
    setPlateFilters((prev) => ({ ...prev, [type]: checked }));
  };

  const handleManualRefresh = () => {
    if (fetchStatus === 'loading') return;
    loadPeriodData(filters.period, true);
  };

  const handleResetFilters = () => {
    setFilters({
      period: 'week',
      minMagnitude: 2.5,
      depth: 'all',
    });
  };

  /**
   * 지도·목록·요약 카드가 동일하게 공유하는 단일 필터링 데이터
   * (판 경계 레이어의 표시 상태는 지진 목록 개수나 필터 결과에 영향을 주지 않음)
   */
  const filteredEarthquakes = useMemo(() => {
    return rawPeriodEarthquakes.filter((eq) => {
      if (eq.magnitude === null || isNaN(eq.magnitude)) {
        if (filters.minMagnitude > 2.5) {
          return false;
        }
      } else if (eq.magnitude < filters.minMagnitude) {
        return false;
      }

      if (filters.depth === 'shallow') {
        return eq.depthKm !== null && !isNaN(eq.depthKm) && eq.depthKm < 70;
      }
      if (filters.depth === 'intermediate') {
        return eq.depthKm !== null && !isNaN(eq.depthKm) && eq.depthKm >= 70 && eq.depthKm < 300;
      }
      if (filters.depth === 'deep') {
        return eq.depthKm !== null && !isNaN(eq.depthKm) && eq.depthKm >= 300;
      }
      if (filters.depth === 'unknown') {
        return eq.depthKm === null || isNaN(eq.depthKm);
      }

      return true;
    });
  }, [rawPeriodEarthquakes, filters.minMagnitude, filters.depth]);

  const maxMagnitude = useMemo(() => {
    const validMags = filteredEarthquakes
      .map((e) => e.magnitude)
      .filter((m): m is number => m !== null && !isNaN(m));
    return validMags.length > 0 ? Math.max(...validMags) : null;
  }, [filteredEarthquakes]);

  const selectedDepthClass = selectedEarthquake
    ? getDepthClassification(selectedEarthquake.depthKm)
    : null;

  // 목록 항목 선택 시 모바일에서는 지도 탭으로 전환하여 즉시 해당 위치를 보여줌
  const handleSelectEarthquakeFromList = (eq: ValidatedEarthquake) => {
    setSelectedEarthquake(eq);
    // 모바일 탭 환경일 때 지도로 자동 포커스
    if (window.innerWidth < 1024) {
      setMobileTab('map');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* 상단 네비게이션 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  지구는 지금 어디서 흔들릴까?
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  {PERIOD_LABELS[filters.period]}
                </span>
                {plateFilters.enabled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <GitBranch className="w-3 h-3" />
                    판 경계 레이어 켜짐
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                중학교 과학 탐구 도구 · 전 세계 지진 관측 및 판 구조론 연계 학습
              </p>
            </div>
          </div>

          {/* 새로고침 버튼 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={fetchStatus === 'loading'}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                fetchStatus === 'loading'
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 shadow-xs active:scale-95'
              }`}
              title="현재 선택된 기간의 지진 데이터를 USGS 서버에서 새로 수신합니다."
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  fetchStatus === 'loading' ? 'animate-spin text-blue-600' : 'text-slate-500'
                }`}
              />
              <span>{fetchStatus === 'loading' ? '지진 데이터 수신 중...' : '데이터 새로고침'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 본문 콘텐츠 영역 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-4">
        {/* 수업 안내 및 핵심 개념 카드 */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-800 text-base">
                  중학교 과학 ‘지권의 변화’ 판 구조론 탐구
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                💡 <strong>‘규모는 지진의 크기를 나타내는 값이고, 진도는 장소에 따라 달라지는 흔들림의 정도입니다.’</strong>
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                지도에서 원의 크기는 <strong>지진 규모(M)</strong>, 원의 색상은 <strong>진원 깊이(km)</strong>를 나타내며,
                하단 목록에서 특정 지진을 선택하면 지도에서 즉시 진원 위치와 팝업을 확인할 수 있습니다.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 lg:max-w-md shrink-0">
              <div className="flex items-center gap-1.5 font-semibold text-amber-950 mb-1">
                <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>데이터 범위 유의 사항</span>
              </div>
              <p className="leading-relaxed text-amber-800">
                본 자료는 USGS 전 세계 관측망 기준 <strong>규모 2.5 이상</strong>의 지진만 수집합니다.
                규모 2.5 미만의 미소 지진이나 관측 한계로 누락된 지진은 포함되지 않으므로, 전 세계 모든 지진을 빠짐없이 보여 주는 것은 아닙니다.
              </p>
            </div>
          </div>
        </section>

        {/* 필터 및 레이어 제어 바 */}
        <FilterBar
          filters={filters}
          onChangeFilters={setFilters}
          onResetFilters={handleResetFilters}
          isLoading={fetchStatus === 'loading'}
          totalLoaded={rawPeriodEarthquakes.length}
          filteredCount={filteredEarthquakes.length}
          plateFilters={plateFilters}
          onTogglePlateBoundary={handleTogglePlateBoundary}
          onToggleBoundaryType={handleToggleBoundaryType}
          plateLoading={plateLoading}
          plateError={plateError}
          onRetryPlateFetch={loadPlateBoundaries}
        />

        {/* 지진 요약 정보 카드 (조건에 맞는 지진 수, 최대 규모, 깊이 구간별 건수) */}
        <EarthquakeSummary earthquakes={filteredEarthquakes} />

        {/* 지진 네트워크 오류 배너 */}
        {fetchStatus === 'error' && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 text-xs sm:text-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-800">네트워크 연결 또는 USGS 지진 데이터 요청 실패</span>
                <p className="text-rose-700 text-xs mt-1 leading-relaxed">
                  {errorMessage || '지진 데이터를 불러오지 못했습니다. 인터넷 연결이나 USGS 서비스 상태를 확인해 주세요.'}
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  ※ API 요청에 실패한 것이며 실제 지진 결과가 0건인 것이 아닙니다. 가상의 모의 데이터를 임의로 표시하지 않습니다.
                </p>
              </div>
            </div>
            <button
              onClick={handleManualRefresh}
              type="button"
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-xs"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 유효 결과 0건 안내 */}
        {fetchStatus === 'success' && filteredEarthquakes.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-amber-900">
                  현재 조건에 맞는 지진이 없습니다. 기간을 늘리거나 최소 규모를 낮춰 보세요.
                </span>
                <p className="text-amber-800 text-xs mt-0.5">
                  선택하신 기간({filters.period === 'day' ? '24시간' : filters.period === 'week' ? '7일' : '30일'}),
                  최소 규모(M {filters.minMagnitude.toFixed(1)} 이상), 깊이 조건에 해당하는 지진이 관측되지 않았습니다.
                </p>
              </div>
            </div>
            <button
              onClick={handleResetFilters}
              type="button"
              className="px-3.5 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors"
            >
              조건 기본값으로 복귀
            </button>
          </div>
        )}

        {/* 모바일 화면 전용 탭 전환 버튼 ([지도 보기] vs [지진 목록 보기]) */}
        <div className="lg:hidden flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'map'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>지도 & 범례 보기</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'list'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>지진 목록 보기 ({filteredEarthquakes.length.toLocaleString()}건)</span>
          </button>
        </div>

        {/* 메인 작업 영역: 지도와 목록/범례 */}
        <div className="flex flex-col gap-5">
          {/* 1. 지도 & 범례 (모바일에서는 map 탭일 때만 표시, 데스크톱에서는 항상 표시) */}
          <div className={`${mobileTab === 'map' ? 'block' : 'hidden lg:block'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* 지도 영역 */}
              <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-600" />
                    세계 지진 및 판 경계 분포 지도 (Leaflet)
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      표시 지진: <strong className="text-blue-700">{filteredEarthquakes.length.toLocaleString()}건</strong>
                    </span>
                    {maxMagnitude !== null && (
                      <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        최대 M {maxMagnitude.toFixed(1)}
                      </span>
                    )}
                    {plateFilters.enabled && plateData && (
                      <span className="text-emerald-700 font-medium">
                        · 판 경계 {plateData.features.length.toLocaleString()}개 선
                      </span>
                    )}
                  </div>
                </div>

                <EarthquakeMap
                  initialCenter={[20, 0]}
                  initialZoom={2}
                  earthquakes={filteredEarthquakes}
                  selectedEarthquake={selectedEarthquake}
                  onSelectEarthquake={(eq) => setSelectedEarthquake(eq)}
                  plateBoundariesData={plateData}
                  plateBoundariesVisible={plateFilters.enabled}
                  boundaryTypeFilters={{
                    convergent: plateFilters.convergent,
                    divergent: plateFilters.divergent,
                    transform: plateFilters.transform,
                    other: plateFilters.other,
                  }}
                />
              </div>

              {/* 범례 영역 */}
              <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4">
                <MapLegend
                  maxMagnitude={maxMagnitude}
                  totalCount={filteredEarthquakes.length}
                  plateBoundariesVisible={plateFilters.enabled}
                />
              </div>
            </div>
          </div>

          {/* 2. 지진 목록 (모바일에서는 list 탭일 때 표시, 데스크톱에서는 지도 하단에 세로 배치) */}
          <div className={`${mobileTab === 'list' ? 'block' : 'hidden lg:block'}`}>
            <EarthquakeList
              earthquakes={filteredEarthquakes}
              selectedEarthquake={selectedEarthquake}
              onSelectEarthquake={handleSelectEarthquakeFromList}
            />
          </div>
        </div>

        {/* 선택한 지진 상세 카드 (원 또는 목록에서 클릭 시 상세 정보 열람) */}
        {selectedEarthquake && (
          <section className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-200 bg-blue-50/20 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  선택한 지진 상세 관측 정보
                </h3>
              </div>
              <div className="text-xs text-slate-500">
                지도 위의 팝업 및 목록에서 선택된 지진의 상세 내용입니다.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">발생 위치</span>
                <span className="font-semibold text-slate-900 text-sm block">
                  {selectedEarthquake.place && selectedEarthquake.place.trim()
                    ? selectedEarthquake.place
                    : '위치 설명 정보 없음'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">지진 규모 (Magnitude)</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {selectedEarthquake.magnitude !== null && !isNaN(selectedEarthquake.magnitude) ? (
                    <span className="text-rose-600">
                      M {selectedEarthquake.magnitude.toFixed(1)}
                      {selectedEarthquake.magType ? (
                        <span className="text-xs text-slate-500 font-normal ml-1">
                          ({selectedEarthquake.magType})
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-slate-400">값 없음</span>
                  )}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">진원 깊이 및 구간</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {selectedEarthquake.depthKm !== null && !isNaN(selectedEarthquake.depthKm) ? (
                    <span style={{ color: selectedDepthClass?.fillColor }}>
                      {selectedEarthquake.depthKm.toFixed(1)} km
                      <span className="text-xs text-slate-500 font-normal ml-1">
                        ({selectedDepthClass?.label})
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">깊이 정보 없음</span>
                  )}
                </span>
                {selectedEarthquake.depthKm !== null && selectedEarthquake.depthKm < 0 && (
                  <p className="mt-1 text-[10px] text-amber-700 bg-amber-50 p-1 rounded">
                    ※ 음수 깊이는 기준면(해수면 등)보다 높은 고지대 진원 또는 관측 수치 역산 추정값과 관련된 원자료 수치입니다.
                  </p>
                )}
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">발생 시각 (한국시간 KST)</span>
                <span className="font-medium text-slate-800 text-xs block">
                  {formatKST(selectedEarthquake.time)}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-slate-500">
                좌표: 위도 {selectedEarthquake.lat.toFixed(3)}°, 경도 {selectedEarthquake.lng.toFixed(3)}°
              </div>
              <div>
                {isValidUsgsUrl(selectedEarthquake.url) ? (
                  <a
                    href={selectedEarthquake.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold underline"
                  >
                    USGS 공식 상세 보고서 열기
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-slate-400 italic">
                    제공된 유효한 USGS 상세 페이지 링크가 없습니다.
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 데이터 상태 및 시각 정보 영역 */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">
                수집 데이터 현황 및 시각 정보
              </h3>
            </div>
            <div className="text-xs text-slate-500">
              지진 수신 상태: <span className="font-semibold text-slate-700">
                {fetchStatus === 'loading'
                  ? '데이터 수신 중'
                  : fetchStatus === 'success'
                  ? '정상 수신 완료'
                  : fetchStatus === 'error'
                  ? '요청 실패'
                  : '대기 중'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* 시각 정보 */}
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>지진 데이터 시각 구분</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-500">USGS 지진 피드 생성 시각:</span>
                  <span className="font-medium text-slate-800">
                    {dataGeneratedTime ? formatKST(dataGeneratedTime) : '시각 정보 없음'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">앱에서 마지막으로 받은 시각:</span>
                  <span className="font-semibold text-blue-700">
                    {lastFetchedAt ? formatKST(lastFetchedAt) : '아직 수신 안 됨'}
                  </span>
                </div>
              </div>
            </div>

            {/* 통계 및 필터/제외 건수 안내 */}
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Activity className="w-3.5 h-3.5 text-rose-600" />
                <span>선택 기간({filters.period === 'day' ? '24시간' : filters.period === 'week' ? '7일' : '30일'}) 통계 및 제외 내역</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">해당 기간 피드 총 수신 항목:</span>
                  <span className="font-medium text-slate-800">{totalFeedCount.toLocaleString()}건</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">유효한 지진 수집 건수:</span>
                  <span className="font-medium text-slate-800">{rawPeriodEarthquakes.length.toLocaleString()}건</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-slate-500">
                  <span>제외 내역 (좌표 무효 / 비지진 항목):</span>
                  <span className="font-medium text-slate-700">
                    좌표 무효 {invalidCoordsCount}건 · 기타 유형 {nonEarthquakeCount}건
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            지구는 지금 어디서 흔들릴까? · 중학교 과학 탐구 웹앱
          </div>
          <div className="flex items-center gap-2 flex-wrap text-center">
            <span>지진 자료: USGS Earthquake Hazards Program</span>
            <span>·</span>
            <span>
              판 경계: <a
                href={USGS_PLATE_BOUNDARIES_SERVICE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-800"
              >
                USGS Tectonic Plate Boundaries (원자료: Peter Bird, 2003)
              </a>
            </span>
            <span>·</span>
            <span>지도: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-800">© OpenStreetMap</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
