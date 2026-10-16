import React from 'react';
import { Layers, Activity, ShieldAlert, GitCommit } from 'lucide-react';
import { getDepthClassification } from '../utils/earthquakeStyling';
import { PLATE_BOUNDARY_STYLES } from '../utils/plateBoundaryService';

interface MapLegendProps {
  maxMagnitude: number | null;
  totalCount: number;
  plateBoundariesVisible: boolean;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  maxMagnitude,
  totalCount,
  plateBoundariesVisible,
}) => {
  const depthCategories = [
    getDepthClassification(20),  // 70km 미만 (주황색)
    getDepthClassification(120), // 70km 이상 300km 미만 (파란색)
    getDepthClassification(400), // 300km 이상 (보라색)
    getDepthClassification(null),// 깊이 정보 없음 (회색)
  ];

  const magSizes = [
    { label: 'M 2.5 ~ 3.5', radius: 4, desc: '작은 원' },
    { label: 'M 4.5', radius: 10, desc: '중간 원' },
    { label: 'M 6.5', radius: 16, desc: '큰 원' },
    { label: 'M 8.0 이상', radius: 22, desc: '최대 크기 원' },
  ];

  const boundaryItems = [
    PLATE_BOUNDARY_STYLES.convergent,
    PLATE_BOUNDARY_STYLES.divergent,
    PLATE_BOUNDARY_STYLES.transform,
    PLATE_BOUNDARY_STYLES.other,
  ];

  return (
    <div className="flex flex-col gap-4 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs h-full">
      {/* 범례 헤더 및 중학교 과학 핵심 개념 안내 */}
      <div className="border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Layers className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-sm text-slate-800">지도 범례 (Legend)</h3>
        </div>
        {/* 규모와 진도의 구분 안내 */}
        <div className="p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900 leading-relaxed font-medium">
          💡 <span className="font-semibold">규모와 진도의 구분:</span>
          <p className="mt-0.5 text-blue-800 font-normal">
            ‘규모는 지진의 크기를 나타내는 값이고, 진도는 장소에 따라 달라지는 흔들림의 정도입니다.’
          </p>
        </div>
      </div>

      {/* 1. 지진 깊이 원 색상 범례 (선 범례와 명확히 분리) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
            1. 지진 진원 깊이 색상 범례
          </span>
          <span className="text-[10px] text-slate-400">지하 깊이 구간</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-snug">
          ※ 깊이 색은 재해 위험 등급이 아니며, 지진이 발생한 진원의 지하 깊이 구간을 나타냅니다.
        </p>

        <div className="space-y-1.5 pt-1">
          {depthCategories.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-4 h-4 rounded-full border shrink-0 shadow-xs"
                  style={{
                    backgroundColor: item.fillColor,
                    borderColor: item.borderColor,
                  }}
                />
                <span className="font-semibold text-slate-800">{item.label}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {item.subLabel}
              </span>
            </div>
          ))}
        </div>

        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/70 text-[10px] text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-700">음수 깊이 안내:</span> 원본 관측 자료의 음수 깊이는 0으로 바꾸지 않고 그대로 표기합니다. 해수면보다 높은 육지 고지대 진원이거나 관측소 기준면·수치 역산 추정값과 관련된 수치일 수 있습니다.
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 2. 지진 규모 크기 범례 (원 반지름 크기) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
            2. 지진 규모 크기 범례 (원의 반지름)
          </span>
          {maxMagnitude !== null && (
            <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              최대 M {maxMagnitude.toFixed(1)}
            </span>
          )}
        </div>

        <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 leading-snug">
          ※ 화면상 원의 크기는 <strong>시각적 비교를 위한 것</strong>이며, 실제 에너지 비율이나 피해 반경을 뜻하지 않습니다.
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {magSizes.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 flex items-center justify-center">
                  <span
                    className="rounded-full bg-slate-400 border border-slate-600 inline-block shrink-0"
                    style={{
                      width: `${item.radius * 2}px`,
                      height: `${item.radius * 2}px`,
                    }}
                  />
                </div>
                <span className="font-medium text-slate-800">{item.label}</span>
              </div>
              <span className="text-[11px] text-slate-400">
                반지름 {item.radius}px
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <div className="w-10 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-slate-300 border border-slate-400" />
              </div>
              <span>규모 정보 없음</span>
            </div>
            <span className="text-[10px] text-slate-400">‘값 없음’ 표기 (최댓값 산정 제외)</span>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 3. 판 경계 선 범례 (원 색상 범례와 분리된 선 모양 및 색상 범례) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            3. 판 경계선 범례 (선 모양 & 색상)
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            plateBoundariesVisible ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
          }`}>
            {plateBoundariesVisible ? '지도에 표시 중' : '현재 꺼짐'}
          </span>
        </div>

        {/* 선 스타일 목록 (색상과 선 모양 함께 표현) */}
        <div className="space-y-2 pt-1">
          {boundaryItems.map((b) => (
            <div
              key={b.typeKey}
              className="p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-xs flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* SVG 선 미리보기 */}
                  <div className="w-10 h-3 flex items-center justify-center">
                    <svg className="w-full h-2" viewBox="0 0 40 8">
                      <line
                        x1="2"
                        y1="4"
                        x2="38"
                        y2="4"
                        stroke={b.color}
                        strokeWidth="3"
                        strokeDasharray={b.dashArray || 'none'}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <span className="font-semibold text-slate-800">{b.koreanName}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {b.originalLabel}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 pl-1">
                {b.description}
              </p>
            </div>
          ))}
        </div>

        {/* 필수 요청 과학 교육 안내문 */}
        <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed">
          <div className="font-bold mb-0.5 text-amber-950">⚠️ 판 구조 탐구 참고 사항</div>
          ‘판 경계는 참고 모델입니다. 지진은 판 내부에서도 발생할 수 있으며, 이 지도는 미래 지진을 예측하지 않습니다.’
        </div>
      </div>
    </div>
  );
};
