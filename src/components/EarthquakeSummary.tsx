import React from 'react';
import { Activity, Zap, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ValidatedEarthquake } from '../types/earthquake';

interface EarthquakeSummaryProps {
  earthquakes: ValidatedEarthquake[];
}

export const EarthquakeSummary: React.FC<EarthquakeSummaryProps> = ({ earthquakes }) => {
  const totalCount = earthquakes.length;

  // 유효한 규모 계산 (null/NaN은 제외)
  const validMagnitudes = earthquakes
    .map((e) => e.magnitude)
    .filter((m): m is number => m !== null && !isNaN(m));

  // 0건이거나 유효한 규모가 없으면 null (표시 시 '해당 없음')
  const maxMagnitude =
    validMagnitudes.length > 0 ? Math.max(...validMagnitudes) : null;

  // 깊이 구간별 집계 (누락 값은 적절히 분리하여 정보 없음으로 집계)
  const shallowCount = earthquakes.filter(
    (e) => e.depthKm !== null && !isNaN(e.depthKm) && e.depthKm < 70
  ).length;

  const intermediateCount = earthquakes.filter(
    (e) => e.depthKm !== null && !isNaN(e.depthKm) && e.depthKm >= 70 && e.depthKm < 300
  ).length;

  const deepCount = earthquakes.filter(
    (e) => e.depthKm !== null && !isNaN(e.depthKm) && e.depthKm >= 300
  ).length;

  const unknownDepthCount = earthquakes.filter(
    (e) => e.depthKm === null || isNaN(e.depthKm)
  ).length;

  const unknownMagCount = earthquakes.filter(
    (e) => e.magnitude === null || isNaN(e.magnitude)
  ).length;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-sm text-slate-800">
            조건 일치 지진 요약 현황
          </h3>
        </div>
        <span className="text-xs text-slate-500">
          지도·목록과 동일한 필터 결과 적용
        </span>
      </div>

      {/* 요약 통계 카드 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* 1. 조건에 맞는 지진 수 */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-medium">조건 일치 지진 수</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-blue-700">
              {totalCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 ml-1">건</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            선택된 기간·규모·깊이 기준
          </span>
        </div>

        {/* 2. 최대 규모 (0건이면 0이 아닌 '해당 없음' 표시) */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-medium">최대 지진 규모</span>
            <Zap className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div>
            {maxMagnitude !== null ? (
              <span className="text-xl sm:text-2xl font-extrabold text-rose-600">
                M {maxMagnitude.toFixed(1)}
              </span>
            ) : (
              <span className="text-base sm:text-lg font-bold text-slate-400">
                해당 없음
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {unknownMagCount > 0
              ? `(규모 미기재 ${unknownMagCount}건 제외)`
              : '유효한 관측값 기준'}
          </span>
        </div>

        {/* 3. 깊이 구간별 건수 (천발 / 중발) */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <div className="text-slate-500 font-medium mb-1 flex items-center justify-between">
            <span>천발 / 중발 지진</span>
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block">70km 미만 (주황):</span>
              <span className="font-bold text-orange-700 text-sm">
                {shallowCount.toLocaleString()}건
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">70~300km (파랑):</span>
              <span className="font-bold text-blue-700 text-sm">
                {intermediateCount.toLocaleString()}건
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            천발: 지표 인근 · 중발: 맨틀 상부
          </span>
        </div>

        {/* 4. 깊이 구간별 건수 (심발 / 정보 없음) */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <div className="text-slate-500 font-medium mb-1 flex items-center justify-between">
            <span>심발 / 깊이 미기재</span>
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block">300km 이상 (보라):</span>
              <span className="font-bold text-purple-700 text-sm">
                {deepCount.toLocaleString()}건
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">정보 없음 (회색):</span>
              <span className="font-bold text-slate-600 text-sm">
                {unknownDepthCount.toLocaleString()}건
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            심발: 섭입대 심부 · 누락 값 구분
          </span>
        </div>
      </div>
    </div>
  );
};
