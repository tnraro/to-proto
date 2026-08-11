# 고양이 토 기록

고양이 토 기록을 사람이 기록하고, 캘린더와 통계로 확인하는 클라이언트 온리 웹 앱.

- 서버·계정·업로드 없음, 모든 데이터는 브라우저 localStorage에 저장
- 고양이별 기록 (날짜/시간, 토 종류, 메모)
- 월간 캘린더 + 일별 상세
- 기간별 통계 (일별 횟수, 종류별 분포, 고양이별 횟수, 시간대별 분포)

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
- `src/lib/storage.ts` — localStorage 저장 계층
- `src/hooks/useStore.ts` — 상태 관리 (고양이/기록 CRUD)
- `src/components/` — 기록 폼, 기록 리스트, 캘린더, 통계, 고양이 관리

## 주의

브라우저 데이터 초기화 시 기록이 사라집니다. 백업(JSON 내보내기/가져오기)은 추후 추가 예정이며, 사진 저장은 IndexedDB 마이그레이션을 염두에 둔 구조입니다.
