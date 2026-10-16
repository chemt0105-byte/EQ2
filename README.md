# 지구는 지금 어디서 흔들릴까?

중학교 과학 교육과정(‘지권의 변화’ 단원)에서 전 세계 지진 발생 위치와 판의 경계를 비교·탐구할 수 있도록 제작된 **정적 웹 애플리케이션(Static Web App)**입니다.

---

## 1. 앱 목적 및 주요 기능

- **학습 목적**: 지진의 발생 위치, 진원의 깊이, 지진의 규모를 전 세계 판의 경계(수렴·발산·보존 경계)와 직접 비교하며 판 구조론의 기본 개념을 시각적으로 학습합니다.
- **실시간 지진 시각화**: 미국 지질조사국(USGS)의 실시간 GeoJSON 피드를 통해 최근 24시간, 7일, 30일간의 규모 2.5 이상 지진을 지도 위에 표시합니다.
- **판 경계 레이어**: USGS 공개 ArcGIS REST 서비스를 연동하여 수렴 경계(실선), 발산 경계(긴 점선), 보존 경계(짧은 점선)를 지도 위에 중첩 표시합니다.
- **다차원 탐구 필터**: 기간(24시간/7일/30일), 최소 규모(2.5~7.0), 진원 깊이(천발/중발/심발)에 따라 데이터를 즉시 필터링합니다.
- **관측 목록 및 요약 정보**: 조건에 부합하는 지진 목록(최신순/규모순 정렬, 페이징 지원)과 통계 요약(총 건수, 최대 규모, 깊이별 건수)을 제공하며, 항목 선택 시 지도의 진원 위치로 즉시 이동합니다.

---

## 2. 데이터 출처 및 라이선스

| 구분 | 출처 | 설명 및 공식 링크 |
| :--- | :--- | :--- |
| **지진 관측 데이터** | **USGS Earthquake Hazards Program** | [USGS Real-time Feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) (규모 2.5+ 실시간 GeoJSON) |
| **판 경계 데이터** | **USGS Tectonic Plate Boundaries**<br>*(원자료: Peter Bird, 2003)* | [USGS ArcGIS REST Service](https://earthquake.usgs.gov/arcgis/rest/services/eq/map_plateboundaries/MapServer/1)<br>*An updated digital model of plate boundaries (Geochemistry, Geophysics, Geosystems)* |
| **배경 지도** | **OpenStreetMap** | © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) |

---

## 3. 과학적 탐구 시 유의사항 및 자료의 한계

1. **데이터 수집 범위의 한계**:
   - 본 애플리케이션에 표시되는 지진은 USGS 전 세계 관측망 기준 **규모 2.5 이상**의 지진입니다.
   - 규모 2.5 미만의 미소 지진이나 관측소 밀도 및 지역적 한계로 누락된 지진은 포함되지 않으므로, **전 세계 모든 지진을 빠짐없이 보여 주는 것은 아닙니다.**
2. **판 경계 모델의 특성**:
   - 지도에 표시된 판 경계선은 지질학적 연구에 기반한 **학술적 참고 모델**입니다.
   - 지진은 판의 경계뿐만 아니라 판의 내부(판 내부 지진)에서도 발생할 수 있습니다.
   - 본 지도는 과거 및 최근 관측 기록을 바탕으로 현상을 탐구하는 교육 도구이며, **미래의 지진을 예보하거나 예측하지 않습니다.**
3. **시각화 표현 기준**:
   - 지도 위 원 마커의 크기는 서로 다른 규모를 직관적으로 비교하기 위한 **화면상 상대적 표시**이며, 실제 지진 에너지 비율이나 지표 피해 반경을 의미하지 않습니다.
   - 진원 깊이의 색상은 위험 등급이 아니며, 지표로부터 진원까지의 깊이 구간(천발: 70km 미만, 중발: 70~300km 미만, 심발: 300km 이상)을 나타냅니다.

---

## 4. 로컬 실행 및 빌드 방법

별도의 백엔드 서버나 데이터베이스, AI API 키가 필요하지 않으며, Node.js 환경에서 브라우저 기반으로 즉시 실행됩니다.

```bash
# 1. 의존성 패키지 설치
npm install

# 2. 로컬 개발 서버 실행 (기본 포트: 3000)
npm run dev

# 3. 배포용 정적 웹 빌드 생성 (dist 폴더 생성)
npm run build

# 4. 빌드 결과물 미리보기
npm run preview
```

---

## 5. GitHub 및 Netlify 배포 설정

본 프로젝트는 단일 페이지 정적 웹 애플리케이션(SPA)이므로 Netlify 및 GitHub Pages에 손쉽게 배포할 수 있습니다.

### Netlify 배포 설정 (`netlify.toml` 기포함)
- **Repository**: GitHub 저장소 연결
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- 루트 디렉터리의 `netlify.toml` 파일에 해당 설정과 SPA 리다이렉트 규칙이 사전 구성되어 있습니다.

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
