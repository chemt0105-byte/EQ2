import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RotateCcw, Compass } from 'lucide-react';
import { ValidatedEarthquake } from '../types/earthquake';
import {
  PlateBoundaryFeatureCollection,
  PlateBoundaryFeature,
} from '../types/plateBoundary';
import { formatKST, isValidUsgsUrl } from '../utils/formatters';
import { getMagnitudeRadius, getDepthClassification } from '../utils/earthquakeStyling';
import {
  translatePlateBoundaryLabel,
  PLATE_BOUNDARY_STYLES,
} from '../utils/plateBoundaryService';

interface EarthquakeMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  earthquakes: ValidatedEarthquake[];
  selectedEarthquake?: ValidatedEarthquake | null;
  onSelectEarthquake?: (eq: ValidatedEarthquake) => void;
  // 판 경계 레이어 관련 props
  plateBoundariesData: PlateBoundaryFeatureCollection | null;
  plateBoundariesVisible: boolean;
  boundaryTypeFilters: {
    convergent: boolean;
    divergent: boolean;
    transform: boolean;
    other: boolean;
  };
}

/**
 * 지진 마커 팝업 (XSS 방지 DOM 생성)
 */
function createEarthquakePopupElement(eq: ValidatedEarthquake): HTMLElement {
  const container = document.createElement('div');
  container.className = 'earthquake-popup p-1 text-slate-800 text-xs leading-relaxed min-w-[230px] max-w-[290px]';

  const depthClass = getDepthClassification(eq.depthKm);

  // 1. 위치 설명
  const titleEl = document.createElement('div');
  titleEl.className = 'font-bold text-sm text-slate-900 border-b border-slate-200 pb-1.5 mb-2 leading-snug';
  titleEl.textContent = eq.place && eq.place.trim() ? eq.place : '위치 설명 정보 없음';
  container.appendChild(titleEl);

  const list = document.createElement('div');
  list.className = 'space-y-1.5';

  // 2. 규모 및 종류
  const magRow = document.createElement('div');
  magRow.className = 'flex items-center justify-between gap-2';
  const magLabel = document.createElement('span');
  magLabel.className = 'text-slate-500 font-medium';
  magLabel.textContent = '지진 규모:';
  const magValue = document.createElement('span');
  magValue.className = 'font-bold text-slate-900 text-sm';

  if (eq.magnitude === null || isNaN(eq.magnitude)) {
    magValue.textContent = '값 없음';
    magValue.className = 'font-medium text-slate-500 text-xs';
  } else {
    const typeStr = eq.magType && eq.magType.trim() ? ` (${eq.magType})` : '';
    magValue.textContent = `M ${eq.magnitude.toFixed(1)}${typeStr}`;
  }
  magRow.appendChild(magLabel);
  magRow.appendChild(magValue);
  list.appendChild(magRow);

  // 3. 진원 깊이 및 깊이 구간
  const depthRow = document.createElement('div');
  depthRow.className = 'flex items-start justify-between gap-2';
  const depthLabel = document.createElement('span');
  depthLabel.className = 'text-slate-500 font-medium shrink-0';
  depthLabel.textContent = '진원 깊이:';
  const depthValueBox = document.createElement('div');
  depthValueBox.className = 'text-right';

  const depthValue = document.createElement('div');
  depthValue.className = 'font-bold';

  if (eq.depthKm === null || isNaN(eq.depthKm)) {
    depthValue.textContent = '깊이 정보 없음';
    depthValue.style.color = depthClass.fillColor;
  } else {
    depthValue.textContent = `${eq.depthKm.toFixed(1)} km`;
    depthValue.style.color = depthClass.fillColor;

    const depthBadge = document.createElement('span');
    depthBadge.className = 'block text-[10px] text-slate-500 font-normal';
    depthBadge.textContent = `(${depthClass.label})`;
    depthValueBox.appendChild(depthBadge);
  }
  depthValueBox.prepend(depthValue);

  if (eq.depthKm !== null && !isNaN(eq.depthKm) && eq.depthKm < 0) {
    const negNotice = document.createElement('p');
    negNotice.className = 'text-[10px] text-amber-700 bg-amber-50 p-1 rounded mt-1 text-left leading-tight';
    negNotice.textContent = '※ 음수 깊이는 해수면 등 기준면보다 높은 고지대 진원 또는 관측소 기준면·수치 추정값과 관련된 수치입니다.';
    depthValueBox.appendChild(negNotice);
  }

  depthRow.appendChild(depthLabel);
  depthRow.appendChild(depthValueBox);
  list.appendChild(depthRow);

  // 4. 발생 시각 (한국시간 KST)
  const timeRow = document.createElement('div');
  timeRow.className = 'flex flex-col gap-0.5 pt-1.5 border-t border-slate-100';
  const timeLabel = document.createElement('span');
  timeLabel.className = 'text-slate-500 font-medium text-[11px]';
  timeLabel.textContent = '발생 시각 (한국시간 KST):';
  const timeValue = document.createElement('span');
  timeValue.className = 'font-medium text-slate-800 text-[11px]';
  timeValue.textContent = formatKST(eq.time);
  timeRow.appendChild(timeLabel);
  timeRow.appendChild(timeValue);
  list.appendChild(timeRow);

  // 5. 좌표 (위도, 경도)
  const coordRow = document.createElement('div');
  coordRow.className = 'flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100';
  const coordLabel = document.createElement('span');
  coordLabel.textContent = '좌표:';
  const coordValue = document.createElement('span');
  coordValue.textContent = `위도 ${eq.lat.toFixed(2)}°, 경도 ${eq.lng.toFixed(2)}°`;
  coordRow.appendChild(coordLabel);
  coordRow.appendChild(coordValue);
  list.appendChild(coordRow);

  // 6. USGS 공식 상세 링크
  const linkRow = document.createElement('div');
  linkRow.className = 'pt-2 mt-1.5 border-t border-slate-200';

  if (isValidUsgsUrl(eq.url)) {
    const link = document.createElement('a');
    link.href = eq.url!;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold underline text-xs';
    link.textContent = 'USGS 공식 상세 정보 보기 ↗';
    linkRow.appendChild(link);
  } else {
    const noLink = document.createElement('span');
    noLink.className = 'text-slate-400 italic text-[11px]';
    noLink.textContent = '제공된 유효한 USGS 상세 페이지 링크가 없습니다.';
    linkRow.appendChild(noLink);
  }
  list.appendChild(linkRow);

  container.appendChild(list);
  return container;
}

/**
 * 판 경계선 선택 시 팝업 (임의 판 이름이나 속도 생성 금지, 원문 NAME과 번역된 경계 종류 표시)
 */
function createPlateBoundaryPopup(feature: PlateBoundaryFeature): HTMLElement {
  const container = document.createElement('div');
  container.className = 'plate-popup p-1 text-slate-800 text-xs leading-relaxed min-w-[210px] max-w-[270px]';

  const props = feature.properties || {};
  const translation = translatePlateBoundaryLabel(props.LABEL);
  const style = PLATE_BOUNDARY_STYLES[translation.typeKey];

  const header = document.createElement('div');
  header.className = 'font-bold text-sm text-slate-900 border-b border-slate-200 pb-1.5 mb-2 flex items-center gap-2';

  const colorBar = document.createElement('span');
  colorBar.className = 'w-3 h-3 rounded-full shrink-0';
  colorBar.style.backgroundColor = style.color;
  header.appendChild(colorBar);

  const titleText = document.createElement('span');
  titleText.textContent = translation.koreanName;
  header.appendChild(titleText);
  container.appendChild(header);

  const list = document.createElement('div');
  list.className = 'space-y-1.5';

  // 1. 원문 NAME
  const nameRow = document.createElement('div');
  nameRow.className = 'flex flex-col gap-0.5';
  const nameLabel = document.createElement('span');
  nameLabel.className = 'text-slate-500 font-medium text-[11px]';
  nameLabel.textContent = '원문 경계 명칭 (NAME):';
  const nameValue = document.createElement('span');
  nameValue.className = 'font-semibold text-slate-800';
  nameValue.textContent = props.NAME && String(props.NAME).trim() ? String(props.NAME) : '명칭 정보 없음';
  nameRow.appendChild(nameLabel);
  nameRow.appendChild(nameValue);
  list.appendChild(nameRow);

  // 2. 원문 LABEL 및 경계 유형
  const labelRow = document.createElement('div');
  labelRow.className = 'flex items-center justify-between gap-2 pt-1 border-t border-slate-100';
  const labelTitle = document.createElement('span');
  labelTitle.className = 'text-slate-500 text-[11px]';
  labelTitle.textContent = '원문 구분 (LABEL):';
  const labelValue = document.createElement('span');
  labelValue.className = 'font-medium text-slate-700 text-[11px]';
  labelValue.textContent = props.LABEL ? String(props.LABEL) : '미분류';
  labelRow.appendChild(labelTitle);
  labelRow.appendChild(labelValue);
  list.appendChild(labelRow);

  // 3. 과학적 성격 설명
  const descRow = document.createElement('div');
  descRow.className = 'p-1.5 bg-slate-50 rounded text-[11px] text-slate-600 border border-slate-200/60 mt-1';
  descRow.textContent = style.description;
  list.appendChild(descRow);

  container.appendChild(list);
  return container;
}

export const EarthquakeMap: React.FC<EarthquakeMapProps> = ({
  initialCenter = [20, 0],
  initialZoom = 2,
  earthquakes,
  selectedEarthquake,
  onSelectEarthquake,
  plateBoundariesData,
  plateBoundariesVisible,
  boundaryTypeFilters,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // 레이어 관리 refs
  const earthquakeMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const plateBoundariesLayerRef = useRef<L.GeoJSON | null>(null);
  const markerMapRef = useRef<Map<string, L.CircleMarker>>(new Map());

  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);
  const [centerCoord, setCenterCoord] = useState<{ lat: number; lng: number }>({
    lat: initialCenter[0],
    lng: initialCenter[1],
  });

  // 지도 인스턴스 초기화 (최초 1회)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(container, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 2,
      zoomSnap: 1,
      zoomDelta: 1,
      maxZoom: 18,
      worldCopyJump: false,
    });

    mapInstanceRef.current = map;

    // 타일 레이어
    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      minZoom: 2,
      maxZoom: 18,
    });
    tileLayer.addTo(map);

    // 판 경계선이 지진 원보다 아래에 그려지도록 전용 Pane 생성
    // (기본 overlayPane은 zIndex 400이며, 판 경계 Pane은 350으로 설정하여 원 클릭 방해 방지)
    if (!map.getPane('plateBoundariesPane')) {
      const platePane = map.createPane('plateBoundariesPane');
      platePane.style.zIndex = '350';
    }

    // 전용 지진 마커 Pane (zIndex 450으로 올려 상위 클릭 우선권 확보)
    if (!map.getPane('earthquakeMarkersPane')) {
      const eqPane = map.createPane('earthquakeMarkersPane');
      eqPane.style.zIndex = '450';
    }

    // 마커 레이어 그룹 생성
    const eqMarkersLayer = L.layerGroup([], { pane: 'earthquakeMarkersPane' }).addTo(map);
    earthquakeMarkersLayerRef.current = eqMarkersLayer;

    const updateMapState = () => {
      const center = map.getCenter();
      setCenterCoord({
        lat: Number(center.lat.toFixed(2)),
        lng: Number(center.lng.toFixed(2)),
      });
      setCurrentZoom(map.getZoom());
    };

    map.on('move', updateMapState);
    map.on('zoomend', updateMapState);

    // 가장 축소된 상태(minZoom=2)에서 아래로 휠을 돌릴 때 화면 밀림 방지
    const handleWheelCapture = (e: WheelEvent) => {
      const zoomSnap = map.options.zoomSnap ?? 1;
      const zoom = map.getZoom();
      const minZoom = map.getMinZoom();

      if (e.deltaY > 0 && zoom - zoomSnap < minZoom) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener('wheel', handleWheelCapture, {
      capture: true,
      passive: false,
    });

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      clearTimeout(resizeTimer);
      container.removeEventListener('wheel', handleWheelCapture, { capture: true });
      map.off('move', updateMapState);
      map.off('zoomend', updateMapState);
      map.remove();
      mapInstanceRef.current = null;
      earthquakeMarkersLayerRef.current = null;
      plateBoundariesLayerRef.current = null;
      markerMapRef.current.clear();
    };
  }, [initialCenter, initialZoom]);

  // 판 경계 레이어 렌더링 및 가시성 제어
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 기존 판 경계 레이어가 있으면 지도에서 제거
    if (plateBoundariesLayerRef.current) {
      map.removeLayer(plateBoundariesLayerRef.current);
      plateBoundariesLayerRef.current = null;
    }

    // 판 경계 표시가 꺼져 있거나 데이터가 없으면 종료
    if (!plateBoundariesVisible || !plateBoundariesData) {
      return;
    }

    // 판 경계 GeoJSON 레이어 생성 (필터 적용 및 전용 pane 설정)
    const plateLayer = L.geoJSON(plateBoundariesData, {
      pane: 'plateBoundariesPane',
      filter: (geoJsonFeature) => {
        const feature = geoJsonFeature as PlateBoundaryFeature;
        const translation = translatePlateBoundaryLabel(feature.properties?.LABEL);
        return boundaryTypeFilters[translation.typeKey];
      },
      style: (geoJsonFeature) => {
        const feature = geoJsonFeature as PlateBoundaryFeature;
        const translation = translatePlateBoundaryLabel(feature.properties?.LABEL);
        const style = PLATE_BOUNDARY_STYLES[translation.typeKey];

        return {
          color: style.color,
          weight: style.weight,
          opacity: style.opacity,
          dashArray: style.dashArray,
          lineCap: 'round',
          lineJoin: 'round',
        };
      },
      onEachFeature: (geoJsonFeature, layer) => {
        const feature = geoJsonFeature as PlateBoundaryFeature;
        const popupEl = createPlateBoundaryPopup(feature);
        layer.bindPopup(popupEl, {
          maxWidth: 280,
          className: 'custom-plate-popup',
        });
      },
    });

    plateLayer.addTo(map);
    plateBoundariesLayerRef.current = plateLayer;
  }, [plateBoundariesData, plateBoundariesVisible, boundaryTypeFilters]);

  // 지진 데이터 렌더링 (지진 원은 판 경계보다 위쪽에 위치)
  useEffect(() => {
    const markersLayer = earthquakeMarkersLayerRef.current;
    if (!markersLayer) return;

    markersLayer.clearLayers();
    markerMapRef.current.clear();

    earthquakes.forEach((eq) => {
      const radius = getMagnitudeRadius(eq.magnitude);
      const depthClass = getDepthClassification(eq.depthKm);

      const marker = L.circleMarker([eq.lat, eq.lng], {
        pane: 'earthquakeMarkersPane',
        radius,
        fillColor: depthClass.fillColor,
        color: depthClass.borderColor,
        weight: 1.5,
        opacity: 0.85,
        fillOpacity: 0.65,
      });

      const popupContent = createEarthquakePopupElement(eq);
      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-leaflet-popup',
      });

      marker.on('click', () => {
        if (onSelectEarthquake) {
          onSelectEarthquake(eq);
        }
      });

      marker.addTo(markersLayer);
      markerMapRef.current.set(eq.id, marker);
    });
  }, [earthquakes, onSelectEarthquake]);

  // 선택된 지진 마커 시점 이동
  useEffect(() => {
    if (!selectedEarthquake || !mapInstanceRef.current) return;
    const marker = markerMapRef.current.get(selectedEarthquake.id);
    if (marker) {
      marker.openPopup();
      mapInstanceRef.current.panTo([selectedEarthquake.lat, selectedEarthquake.lng], {
        animate: true,
      });
    }
  }, [selectedEarthquake]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(initialCenter, initialZoom, {
        animate: true,
      });
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden flex flex-col">
      {/* 지도 상단 정보 표시줄 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white border-b border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            중심: 위도 {centerCoord.lat >= 0 ? `${centerCoord.lat}°N` : `${Math.abs(centerCoord.lat)}°S`}, 경도 {centerCoord.lng >= 0 ? `${centerCoord.lng}°E` : `${Math.abs(centerCoord.lng)}°W`}
          </span>
          <span className="hidden sm:inline-block text-slate-300">|</span>
          <span className="font-medium text-slate-700">
            확대 수준: <span className="font-semibold text-blue-600">{currentZoom}</span>단계 (최소 2 ~ 최대 18)
          </span>
        </div>

        <button
          onClick={handleResetView}
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer"
          title="지도를 처음 위치(위도 20, 경도 0, 확대 2)로 복귀합니다."
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>초기 위치로 복귀</span>
        </button>
      </div>

      {/* 지도 컨테이너 */}
      <div
        ref={mapContainerRef}
        className="w-full flex-1 min-h-[480px] sm:min-h-[560px] md:min-h-[640px] bg-sky-50 z-0"
      />
    </div>
  );
};
