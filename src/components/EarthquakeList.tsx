import React, { useState, useMemo } from 'react';
import {
  ValidatedEarthquake,
} from '../types/earthquake';
import { formatKST } from '../utils/formatters';
import { getDepthClassification } from '../utils/earthquakeStyling';
import {
  ListFilter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Compass,
  Zap,
} from 'lucide-react';

type SortOption = 'latest' | 'magnitude';

interface EarthquakeListProps {
  earthquakes: ValidatedEarthquake[];
  selectedEarthquake?: ValidatedEarthquake | null;
  onSelectEarthquake: (eq: ValidatedEarthquake) => void;
}

const ITEMS_PER_PAGE = 15;

export const EarthquakeList: React.FC<EarthquakeListProps> = ({
  earthquakes,
  selectedEarthquake,
  onSelectEarthquake,
}) => {
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 정렬 처리 (최신순 / 규모 큰 순)
  const sortedEarthquakes = useMemo(() => {
    const list = [...earthquakes];
    if (sortOption === 'latest') {
      return list.sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
    } else {
      return list.sort((a, b) => {
        const magA = a.magnitude !== null && !isNaN(a.magnitude) ? a.magnitude : -999;
        const magB = b.magnitude !== null && !isNaN(b.magnitude) ? b.magnitude : -999;
        return magB - magA;
      });
    }
  }, [earthquakes, sortOption]);

  const totalCount = sortedEarthquakes.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  // 현재 페이지 범위 계산
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalCount);

  // 현재 페이지에 표시할 항목들 (지도나 요약 데이터는 자르지 않고 목록 페이징에만 사용)
  const paginatedItems = useMemo(() => {
    return sortedEarthquakes.slice(startIndex, endIndex);
  }, [sortedEarthquakes, startIndex, endIndex]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, eq: ValidatedEarthquake) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectEarthquake(eq);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
      {/* 헤더 및 정렬 도구 */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-sm text-slate-800">지진 관측 목록</h3>
        </div>

        {/* 정렬 버튼 그룹 (최신순 / 규모 큰 순) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
          <span className="text-[11px] text-slate-500 font-medium px-1 flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" />
            정렬:
          </span>
          <button
            type="button"
            onClick={() => {
              setSortOption('latest');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              sortOption === 'latest'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            최신순
          </button>
          <button
            type="button"
            onClick={() => {
              setSortOption('magnitude');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              sortOption === 'magnitude'
                ? 'bg-white text-rose-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            규모 큰 순
          </button>
        </div>
      </div>

      {/* 건수 표기 (전체 몇 건 중 몇 건을 보고 있는지 명확히 표기) */}
      <div className="px-4 py-2 bg-blue-50/50 border-b border-slate-100 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <span>
          전체 <strong className="text-slate-900">{totalCount.toLocaleString()}건</strong> 중{' '}
          {totalCount > 0 ? (
            <>
              <strong className="text-blue-700">{startIndex + 1}</strong> ~{' '}
              <strong className="text-blue-700">{endIndex}건</strong> 표시
            </>
          ) : (
            '0건'
          )}
        </span>
        {totalCount > 0 && (
          <span className="text-slate-400 font-medium">
            (페이지 {safeCurrentPage} / {totalPages})
          </span>
        )}
      </div>

      {/* 목록 리스트 */}
      <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
        {totalCount === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            조건에 일치하는 지진 항목이 없습니다.
          </div>
        ) : (
          paginatedItems.map((eq) => {
            const isSelected = selectedEarthquake?.id === eq.id;
            const depthClass = getDepthClassification(eq.depthKm);

            return (
              <div
                key={eq.id}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                onClick={() => onSelectEarthquake(eq)}
                onKeyDown={(e) => handleKeyDown(e, eq)}
                className={`p-3.5 transition-colors cursor-pointer flex flex-col gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  isSelected
                    ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* 상단: 규모 배지 + 위치 설명 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* 규모 배지 */}
                    {eq.magnitude !== null && !isNaN(eq.magnitude) ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        <Zap className="w-3 h-3 text-rose-500" />
                        M {eq.magnitude.toFixed(1)}
                        {eq.magType && (
                          <span className="text-[10px] text-rose-400 font-normal">
                            ({eq.magType})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-500 shrink-0">
                        값 없음
                      </span>
                    )}

                    {/* 위치 설명 */}
                    <span className="font-semibold text-xs text-slate-900 leading-snug line-clamp-1">
                      {eq.place && eq.place.trim() ? eq.place : '위치 설명 정보 없음'}
                    </span>
                  </div>

                  <span className="text-[10px] text-blue-600 shrink-0 font-medium">
                    {isSelected ? '선택됨' : '지도 보기 ↗'}
                  </span>
                </div>

                {/* 하단 세부 정보: 진원 깊이 및 한국시간 발생 시각 */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                  <div className="flex items-center gap-2">
                    {/* 깊이 정보 */}
                    <span className="flex items-center gap-1 font-medium">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: depthClass.fillColor }}
                      />
                      {eq.depthKm !== null && !isNaN(eq.depthKm)
                        ? `${eq.depthKm.toFixed(1)} km (${depthClass.label})`
                        : '깊이 정보 없음'}
                    </span>

                    {/* 음수 깊이 인라인 표시 */}
                    {eq.depthKm !== null && eq.depthKm < 0 && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded">
                        (음수 깊이 원자료)
                      </span>
                    )}
                  </div>

                  {/* 발생 시각 (한국시간 KST) */}
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatKST(eq.time)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 페이지네이션 하단 바 */}
      {totalPages > 1 && (
        <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => handlePageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              safeCurrentPage <= 1
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 active:bg-slate-200 shadow-xs'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>이전</span>
          </button>

          <span className="text-xs text-slate-600 font-semibold">
            {safeCurrentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => handlePageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPages}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              safeCurrentPage >= totalPages
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 active:bg-slate-200 shadow-xs'
            }`}
          >
            <span>다음</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
