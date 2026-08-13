# 고양이 토 기록

고양이 토 기록을 사람이 기록하고, 캘린더와 통계로 확인하는 클라이언트 온리 웹 앱.

- 서버·계정·업로드 없음, 모든 데이터는 브라우저 IndexedDB에 저장 (정규화 스토어)
- 고양이별 기록 (날짜/시간, 토 종류 다중 선택, 메모, 사진 여러 장)
- 월간 캘린더 + 일별 상세
- 기간별 통계 (일별 횟수, 종류별 분포, 고양이별 횟수, 시간대별 분포)
- 임계값 규칙 기반 경고 (기록 추가 직후 위반 시 모달 + 경고 이력)

## 실행

```sh
bun install
bun run dev
```

## 빌드

```sh
bun run build   # tsc -b && vite build
bun run lint    # oxlint
```

## 구조

- `src/types.ts` — 데이터 모델 + 토 종류 정의
- `src/lib/db.ts` — IndexedDB 래퍼 (정규화 오브젝트 스토어: cats/records/rules/alertLog/photos)
- `src/lib/storage.ts` — 저장 계층 (개체 단위 CRUD)
- `src/lib/image.ts` — 이미지 리사이즈 (1280px JPEG)
- `src/lib/thresholds.ts` — 임계값 평가 로직
- `src/hooks/useStore.ts` — 상태 관리 (고양이/기록/규칙/경고 CRUD + hydration)
- `src/components/` — 기록 폼(다중 사진), 기록 리스트, 캘린더, 통계, 경고 규칙, 설정

## 테스트

```sh
bun test   # 순수 로직 단위 테스트 (thresholds)
```

## 주의

브라우저 데이터 초기화 시 기록이 사라집니다. 백업(JSON 내보내기/가져오기)은 추후 추가 예정입니다.
