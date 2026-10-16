import React from 'react';
import { PeriodOption, DepthFilterOption, FilterState } from '../types/earthquake';
import { PlateBoundaryFilters } from '../types/plateBoundary';
import { PLATE_BOUNDARY_STYLES } from '../utils/plateBoundaryService';
import {
  Filter,
  Calendar,
  Zap,
  Layers,
  RotateCcw,
  GitBranch,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onChangeFilters: (updater: (prev: FilterState) => FilterState) => void;
  onResetFilters: () => void;
  isLoading: boolean;
  totalLoaded: number;
  filteredCount: number;
  // 판 경계 관련 props
  plateFilters: PlateBoundaryFilters;
  onTogglePlateBoundary: (enabled: boolean) => void;
  onToggleBoundaryType: (type: 'convergent' | 'divergent' | 'transform' | 'other', checked: boolean) => void;
  plateLoading: boolean;
  plateError: string | null;
  onRetryPlateFetch: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChangeFilters,
  onResetFilters,
  isLoading,
  totalLoaded,
  filteredCount,
  plateFilters,
  onTogglePlateBoundary,
  onToggleBoundaryType,
  plateLoading,
  plateError,
  onRetryPlateFetch,
}) => {
  const periodOptions: { id: PeriodOption; label: string; subText: string }[] = [
    { id: 'day', label: '최근 24시간', subText: 'Past Day' },
    { id: 'week', label: '최근 7일', subText: 'Past Week (기본)' },
    { id: 'month', label: '최근 30일', subText: 'Past 30 Days' },
  ];

  const minMagOptions = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0];

  const depthOptions: { id: DepthFilterOption; label: string; colorDot?: string }[] = [
    { id: 'all', label: '전체 깊이' },
    { id: 'shallow', label: '70km 미만', colorDot: '#f97316' },
    { id: 'intermediate', label: '70~300km 미만', colorDot: '#3b82f6' },
    { id: 'deep', label: '300km 이상', colorDot: '#a855f7' },
    { id: 'unknown', label: '정보 없음', colorDot: '#94a3b8' },
  ];

  const isDefault =
    filters.period === 'week' &&
    filters.minMagnitude === 2.5 &&
    filters.depth === 'all';

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col gap-4">
      {/* 필터 타이틀 & 조건 초기화 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-sm text-slate-800">탐구 조건 및 레이어 설정</h3>
          <span className="text-xs text-slate-500">
            (지진 조건 필터링 및 USGS 판 경계선 표시)
          </span>
        </div>

        <button
          onClick={onResetFilters}
          disabled={isDefault && !isLoading}
          type="button"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            isDefault
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:bg-slate-300'
          }`}
          title="지진 조건을 최근 7일, 최소 규모 2.5, 깊이 전체로 되돌립니다."
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>지진 조건 초기화</span>
        </button>
      </div>

      {/* 필터 컨트롤 그룹 (기간, 최소 규모, 깊이) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. 기간 선택 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>1. 관측 기간 선택</span>
            {isLoading && (
              <span className="text-[10px] text-blue-600 font-normal animate-pulse">
                (불러오는 중...)
              </span>
            )}
          </label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
            {periodOptions.map((opt) => {
              const active = filters.period === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onChangeFilters((prev) => ({ ...prev, period: opt.id }))
                  }
                  className={`py-1.5 px-1 text-xs font-medium rounded-lg transition-all text-center cursor-pointer ${
                    active
                      ? 'bg-white text-blue-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 최소 규모 선택 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-rose-600" />
              <span>2. 최소 규모 (Magnitude)</span>
            </span>
            <span className="text-rose-600 font-extrabold text-xs">
              M {filters.minMagnitude.toFixed(1)} 이상
            </span>
          </label>
          <select
            value={filters.minMagnitude}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeFilters((prev) => ({ ...prev, minMagnitude: val }));
            }}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            {minMagOptions.map((mag) => (
              <option key={mag} value={mag}>
                M {mag.toFixed(1)} 이상 {mag === 2.5 ? '(기본: 전체 포함)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 3. 진원 깊이 선택 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>3. 진원 깊이 선택</span>
          </label>
          <select
            value={filters.depth}
            onChange={(e) => {
              const val = e.target.value as DepthFilterOption;
              onChangeFilters((prev) => ({ ...prev, depth: val }));
            }}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            {depthOptions.map((depth) => (
              <option key={depth.id} value={depth.id}>
                {depth.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 판 경계(Tectonic Plate Boundaries) 레이어 컨트롤 영역 */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* 전체 판 경계 켜기/끄기 마스터 토글 */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={plateFilters.enabled}
                onChange={(e) => onTogglePlateBoundary(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                USGS 판 경계 레이어 표시
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                (기본 상태: 끄기)
              </span>
            </div>
          </div>

          {/* 판 경계 전용 로딩/상태 인디케이터 (지진 상태와 완전히 독립) */}
          <div className="text-xs flex items-center gap-2">
            {plateLoading && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium text-[11px]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                판 경계 데이터 수신 중 (ArcGIS)...
              </span>
            )}
            {plateError && (
              <div className="inline-flex items-center gap-2 text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>판 경계 수신 실패</span>
                <button
                  type="button"
                  onClick={onRetryPlateFetch}
                  className="underline font-bold hover:text-rose-900 cursor-pointer"
                >
                  다시 시도
                </button>
              </div>
            )}
            {!plateLoading && !plateError && plateFilters.enabled && (
              <span className="text-[11px] text-emerald-700 font-medium">
                ✓ 1,175개 판 경계선 활성화됨
              </span>
            )}
          </div>
        </div>

        {/* 판 경계가 켜져 있을 때만 세부 종류 선택 UI 활성화, 꺼져 있으면 비활성화/접음 */}
        {plateFilters.enabled ? (
          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span className="font-semibold text-slate-700 text-xs">
              경계 종류별 표시:
            </span>

            {/* 수렴 경계 */}
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={plateFilters.convergent}
                onChange={(e) => onToggleBoundaryType('convergent', e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <span
                className="w-3 h-0.5 inline-block"
                style={{ backgroundColor: PLATE_BOUNDARY_STYLES.convergent.color }}
              />
              <span className="text-slate-800 font-medium">
                수렴 경계 (실선)
              </span>
            </label>

            {/* 발산 경계 */}
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={plateFilters.divergent}
                onChange={(e) => onToggleBoundaryType('divergent', e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <span
                className="w-3 h-0.5 border-t-2 border-dashed inline-block"
                style={{ borderColor: PLATE_BOUNDARY_STYLES.divergent.color }}
              />
              <span className="text-slate-800 font-medium">
                발산 경계 (긴 점선)
              </span>
            </label>

            {/* 보존 경계 */}
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={plateFilters.transform}
                onChange={(e) => onToggleBoundaryType('transform', e.target.checked)}
                className="rounded text-slate-700 focus:ring-slate-500 cursor-pointer"
              />
              <span
                className="w-3 h-0.5 border-t-2 border-dotted inline-block"
                style={{ borderColor: PLATE_BOUNDARY_STYLES.transform.color }}
              />
              <span className="text-slate-800 font-medium">
                보존 경계 (짧은 점선)
              </span>
            </label>

            {/* 기타·미분류 */}
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={plateFilters.other}
                onChange={(e) => onToggleBoundaryType('other', e.target.checked)}
                className="rounded text-slate-400 focus:ring-slate-400 cursor-pointer"
              />
              <span
                className="w-3 h-0.5 border-t-2 border-dotted inline-block"
                style={{ borderColor: PLATE_BOUNDARY_STYLES.other.color }}
              />
              <span className="text-slate-600">
                기타·미분류 (옅은 점선)
              </span>
            </label>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic">
            ※ 판 경계 레이어를 켜면 수렴·발산·보존 경계별 표시 선택 메뉴가 활성화됩니다.
          </div>
        )}
      </div>

      {/* 현재 지진 필터 조건 및 개수 명확한 표기 영역 */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-700">현재 적용 조건:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium text-slate-800">
            {filters.period === 'day' ? '최근 24시간' : filters.period === 'week' ? '최근 7일' : '최근 30일'}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium text-rose-700">
            규모 M {filters.minMagnitude.toFixed(1)} 이상
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium text-purple-700">
            깊이 {depthOptions.find((d) => d.id === filters.depth)?.label}
          </span>
        </div>

        <div className="text-right shrink-0">
          <span className="text-slate-500 text-xs">조건 일치 지진: </span>
          <span className="font-bold text-sm text-blue-700">
            {filteredCount.toLocaleString()}건
          </span>
          <span className="text-slate-400 text-xs"> / 수집 전체 {totalLoaded.toLocaleString()}건</span>
        </div>
      </div>

      {/* 수치 명시 안내 */}
      <p className="text-[11px] text-slate-500 leading-snug px-1">
        ※ 이 수치는 <strong>현재 지도 화면 안쪽의 개수가 아니라 선택한 기간·규모·깊이 조건 전체에 해당하는 전 세계 지진의 총 개수</strong>입니다.
      </p>
    </div>
  );
};
