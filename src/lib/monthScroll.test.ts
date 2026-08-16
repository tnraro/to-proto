import { describe, expect, test } from 'bun:test'
import { monthIndex, type MonthLayout } from './monthList'
import {
  beginMonthScroll,
  createMonthScroll,
  endMonthScroll,
  moveMonthScroll,
  normalizeWheelDelta,
  wheelMonthScroll,
} from './monthScroll'

const LAYOUT: MonthLayout = { headerH: 64, rowH: 52 }
// 2026-02: 4행 (h=272), 2026-01: 5행 (h=324), 2026-03: 5행 (h=324)
const FEB = monthIndex(new Date(2026, 1, 1))
const JAN = FEB - 1
const MAR = FEB + 1
const DEC = FEB - 2

describe('begin / move (세션)', () => {
  test('begin은 pressed 시작', () => {
    const s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    expect(s.session).toBe('pressed')
  })

  test('임계값 미만 이동은 pressed 유지, 위치 불변', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    s = moveMonthScroll(s, 108, 10, LAYOUT).state
    expect(s.session).toBe('pressed')
    expect(s.viewTop).toBe(0)
  })

  test('임계값 도달 시 dragging 전환, 위치 안정(takeover)', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    const r = moveMonthScroll(s, 115, 10, LAYOUT)
    expect(r.state.session).toBe('dragging')
    expect(r.active).toBe(true)
    expect(r.state.viewTop).toBe(0)
  })
})

describe('move (드래그 이동)', () => {
  test('위로 드래그하면 viewTop 증가 (첫 10px는 takeover가 소비)', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 200, 0)
    s = moveMonthScroll(s, 185, 10, LAYOUT).state // takeover (15px)
    s = moveMonthScroll(s, 150, 20, LAYOUT).state
    expect(s.anchorIdx).toBe(FEB)
    expect(s.viewTop).toBe(35)
  })

  test('아래로 드래그하면 이전 달 앵커로 시프트 (연속성)', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    s = moveMonthScroll(s, 120, 10, LAYOUT).state // takeover (+20)
    s = moveMonthScroll(s, 160, 20, LAYOUT).state // viewTop -40 → JAN
    expect(s.anchorIdx).toBe(JAN)
    expect(s.viewTop).toBe(324 - 40)
  })

  test('위로 드래그하면 다음 달 앵커로 시프트 (연속성)', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 300, 0)
    s = moveMonthScroll(s, 180, 20, LAYOUT).state // takeover
    s = moveMonthScroll(s, -100, 30, LAYOUT).state // viewTop 280 > 272
    expect(s.anchorIdx).toBe(MAR)
    expect(s.viewTop).toBe(280 - 272)
  })

  test('한 제스처로 여러 달 시프트 가능', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 300, 0)
    s = moveMonthScroll(s, 180, 20, LAYOUT).state // takeover
    s = moveMonthScroll(s, -420, 30, LAYOUT).state // viewTop 600 → 두 달
    expect(s.anchorIdx).toBe(FEB + 2)
    expect(s.viewTop).toBe(600 - 272 - 324)
  })
})

describe('end (스냅 판정)', () => {
  test('pressed 상태 해제는 change 0', () => {
    const s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(0)
    expect(r.state.session).toBe('idle')
  })

  test('절반(50%) 넘게 올리면 다음 달', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    s = moveMonthScroll(s, 85, 100, LAYOUT).state // takeover
    s = moveMonthScroll(s, -115, 1000, LAYOUT).state // viewTop 200 > 136, 속도 0.22
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(1)
  })

  test('경계를 막 넘고 멈추면 새 앵커 유지', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    s = moveMonthScroll(s, 115, 100, LAYOUT).state // takeover (+15)
    s = moveMonthScroll(s, 415, 800, LAYOUT).state // viewTop -300 → JAN 24, 속도 0.39
    const r = endMonthScroll(s, LAYOUT)
    expect(s.anchorIdx).toBe(JAN)
    expect(r.change).toBe(0)
  })

  test('경계를 살짝 넘고 멈추면 이전 위치로 복귀', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    s = moveMonthScroll(s, 115, 100, LAYOUT).state // takeover (+15)
    s = moveMonthScroll(s, 155, 400, LAYOUT).state // viewTop -40 → JAN 284, 속도 0.14
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(1)
  })

  test('중간 위치면 원위치', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    s = moveMonthScroll(s, 85, 100, LAYOUT).state // takeover
    s = moveMonthScroll(s, 35, 400, LAYOUT).state // viewTop 50, 속도 0.16
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(0)
  })

  test('느린 드래그로 멀리 가도 비율로 판정', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    s = moveMonthScroll(s, 110, 400, LAYOUT).state // takeover
    s = moveMonthScroll(s, 250, 800, LAYOUT).state // viewTop 140, 속도 0.19
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(1)
  })

  test('빠른 위쪽 플릭은 거리와 무관하게 다음 달', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 200, 0)
    s = moveMonthScroll(s, 190, 20, LAYOUT).state // takeover
    s = moveMonthScroll(s, 160, 30, LAYOUT).state // viewTop 30, 속도 -1.33
    expect(s.viewTop).toBe(30)
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(1)
  })

  test('빠른 아래쪽 플릭은 이전 달', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    s = moveMonthScroll(s, 110, 20, LAYOUT).state // takeover
    s = moveMonthScroll(s, 160, 30, LAYOUT).state // viewTop -50 → JAN 274, 속도 2
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(-1)
    expect(r.state.anchorIdx).toBe(JAN)
  })

  test('경계를 넘은 아래 플릭은 중첩 없이 현재 앵커로 (1개월)', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    s = moveMonthScroll(s, 130, 20, LAYOUT).state // takeover (+30 → JAN으로 시프트)
    s = moveMonthScroll(s, 190, 30, LAYOUT).state // viewTop -60 → JAN 264, 속도 3
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(-1)
    expect(r.state.anchorIdx).toBe(JAN)
  })

  test('긴 위쪽 드래그 후 플릭도 중첩 없이 현재 앵커로', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 300, 0)
    s = moveMonthScroll(s, 180, 20, LAYOUT).state // takeover
    s = moveMonthScroll(s, -100, 30, LAYOUT).state // viewTop 280 → MAR, 속도 -13
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(1)
    expect(r.state.anchorIdx).toBe(MAR)
  })

  test('아래 드래그 절반 미만 느린 릴리스는 원래 월로 복귀 (위치 규칙)', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 200, 0)
    s = moveMonthScroll(s, 230, 100, LAYOUT).state // takeover (+30)
    s = moveMonthScroll(s, 300, 500, LAYOUT).state // viewTop -70 → JAN 254 (> 절반), 속도 0.2
    expect(s.anchorIdx).toBe(JAN)
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(1)
    expect(r.state.anchorIdx).toBe(FEB)
  })

  test('아래 드래그 절반 초과 느린 릴리스는 이전 달로 이동', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 200, 0)
    s = moveMonthScroll(s, 230, 100, LAYOUT).state // takeover
    s = moveMonthScroll(s, 400, 500, LAYOUT).state // viewTop -170 → JAN 154 (< 절반), 속도 0.4
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(0)
    expect(r.state.anchorIdx).toBe(JAN)
  })

  test('역방향(아래) 드래그 후 순방향(위) 플릭: 목표는 시작 앵커 ± 1', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 300, 0)
    s = moveMonthScroll(s, 420, 100, LAYOUT).state // takeover
    s = moveMonthScroll(s, 1060, 400, LAYOUT).state // 느린 아래 드래그 640px → DEC 8
    expect(s.anchorIdx).toBe(DEC)
    s = moveMonthScroll(s, 760, 430, LAYOUT).state // 빠른 위 플릭 → viewTop 308, 속도 -10
    expect(s.anchorIdx).toBe(DEC)
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(1)
    expect(r.state.anchorIdx).toBe(MAR) // 릴리스 앵커(DEC)에서 3개월 앞
  })
})

describe('wheelMonthScroll', () => {
  test('휠 아래로 = 다음 달 방향 (네이티브 스크롤 방향)', () => {
    let s = wheelMonthScroll(createMonthScroll(FEB), 300, 0, LAYOUT).state // 300 > 272
    expect(s.anchorIdx).toBe(MAR)
    expect(s.viewTop).toBe(28)
  })

  test('휠 위로 = 이전 달 방향', () => {
    const s = wheelMonthScroll(createMonthScroll(FEB), -50, 0, LAYOUT).state
    expect(s.anchorIdx).toBe(JAN)
    expect(s.viewTop).toBe(324 - 50)
  })

  test('휠 버스트는 마지막 방향으로 1개월 스냅', () => {
    let s = wheelMonthScroll(createMonthScroll(FEB), 300, 0, LAYOUT).state
    s = wheelMonthScroll(s, 200, 100, LAYOUT).state
    s = wheelMonthScroll(s, 300, 200, LAYOUT).state // APR 204
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(1)
    expect(r.state.anchorIdx).toBe(MAR + 2)
  })

  test('휠 아주 조금 굴려도 취소 없이 이동 (아래)', () => {
    let s = wheelMonthScroll(createMonthScroll(FEB), 30, 0, LAYOUT).state // FEB 30 < 절반
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(1)
    expect(r.state.anchorIdx).toBe(MAR)
  })

  test('휠 아주 조금 굴려도 취소 없이 이동 (위)', () => {
    let s = wheelMonthScroll(createMonthScroll(FEB), -30, 0, LAYOUT).state // JAN 294
    expect(s.anchorIdx).toBe(JAN)
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(-1)
    expect(r.state.anchorIdx).toBe(DEC)
  })

  test('버스트 후반의 방향이 판정', () => {
    let s = wheelMonthScroll(createMonthScroll(FEB), 300, 0, LAYOUT).state // MAR 28
    s = wheelMonthScroll(s, -50, 100, LAYOUT).state // viewTop -22 → FEB 250, wheelDir -1
    expect(s.anchorIdx).toBe(FEB)
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(-1)
    expect(r.state.anchorIdx).toBe(JAN)
  })

  test('핑거 세션 중 휠은 무시', () => {
    let s = beginMonthScroll(createMonthScroll(FEB), 100, 0)
    s = moveMonthScroll(s, 130, 10, LAYOUT).state // dragging
    const r = wheelMonthScroll(s, 300, 20, LAYOUT)
    expect(r.active).toBe(false)
    expect(r.state).toBe(s)
  })

  test('휠 세션 중 moveMonthScroll은 무시 (호버 오프셋 차단)', () => {
    let s = wheelMonthScroll(createMonthScroll(FEB), 200, 0, LAYOUT).state // 'wheel' 세션
    const r = moveMonthScroll(s, 400, 10, LAYOUT)
    expect(r.active).toBe(false)
    expect(r.state).toBe(s)
    expect(s.viewTop).toBe(200)
  })
})

describe('normalizeWheelDelta', () => {
  test('px 모드는 그대로', () => {
    expect(normalizeWheelDelta(120, 0, 800)).toBe(120)
  })

  test('라인 모드는 16배', () => {
    expect(normalizeWheelDelta(3, 1, 800)).toBe(48)
  })

  test('페이지 모드는 뷰포트 높이 배', () => {
    expect(normalizeWheelDelta(2, 2, 800)).toBe(1600)
  })
})

describe('입력 핸드오프 (휠 → 포인터)', () => {
  test('begin은 잔존 세션을 버리고 위치를 유지한 채 재시작', () => {
    let s = wheelMonthScroll(createMonthScroll(FEB), 200, 0, LAYOUT).state // FEB 200, 'wheel'
    s = beginMonthScroll(s, 500, 100)
    expect(s.session).toBe('pressed')
    expect(s.anchorIdx).toBe(FEB)
    expect(s.viewTop).toBe(200)
    expect(s.startAnchorIdx).toBe(FEB)
    expect(s.samples).toEqual([{ t: 100, y: 500 }])
  })

  test('휠 직후 첫 pointermove는 점프 없이 손가락을 따름', () => {
    let s = wheelMonthScroll(createMonthScroll(FEB), 200, 0, LAYOUT).state // FEB 200
    s = beginMonthScroll(s, 500, 100)
    s = moveMonthScroll(s, 470, 110, LAYOUT).state // takeover (-30)
    s = moveMonthScroll(s, 450, 120, LAYOUT).state // 위로 20 → FEB 220
    expect(s.anchorIdx).toBe(FEB)
    expect(s.viewTop).toBe(220)
  })

  test('핸드오프 후 새 제스처의 startAnchorIdx는 현재 앵커', () => {
    let s = wheelMonthScroll(createMonthScroll(FEB), 300, 0, LAYOUT).state // MAR 28
    s = wheelMonthScroll(s, 100, 100, LAYOUT).state // MAR 128
    s = beginMonthScroll(s, 400, 200)
    expect(s.startAnchorIdx).toBe(MAR)
  })
})
