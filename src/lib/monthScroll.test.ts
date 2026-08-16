import { describe, expect, test } from 'bun:test'
import { monthIndex, type MonthLayout } from './monthList'
import {
  beginMonthScroll,
  createMonthScroll,
  endMonthScroll,
  moveMonthScroll,
  snapStartState,
  wheelMonthScroll,
} from './monthScroll'

const LAYOUT: MonthLayout = { headerH: 64, rowH: 52 }
// 2026-02: 4행 (h=272), 2026-01: 5행 (h=324), 2026-03: 5행 (h=324)
const FEB = monthIndex(new Date(2026, 1, 1))
const JAN = FEB - 1
const MAR = FEB + 1

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
    s = moveMonthScroll(s, 160, 30, LAYOUT).state // viewTop 50, 속도 2
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(-1)
  })
})

describe('snapStartState (애니메이션 연속성)', () => {
  test('다음 달 스냅: 화면 위치 불변', () => {
    const s = snapStartState({ ...createMonthScroll(FEB), viewTop: 50 }, 1, LAYOUT)
    expect(s.anchorIdx).toBe(MAR)
    expect(s.viewTop).toBe(50 - 272)
  })

  test('이전 달 스냅', () => {
    const s = snapStartState({ ...createMonthScroll(FEB), viewTop: 50 }, -1, LAYOUT)
    expect(s.anchorIdx).toBe(JAN)
    expect(s.viewTop).toBe(50 + 324)
  })

  test('원위치 스냅', () => {
    const s = snapStartState({ ...createMonthScroll(FEB), viewTop: 50 }, 0, LAYOUT)
    expect(s.anchorIdx).toBe(FEB)
    expect(s.viewTop).toBe(50)
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

  test('휠도 플릭 속도로 스냅 판정', () => {
    let s = wheelMonthScroll(createMonthScroll(FEB), 300, 0, LAYOUT).state
    s = wheelMonthScroll(s, 200, 100, LAYOUT).state
    s = wheelMonthScroll(s, 300, 200, LAYOUT).state
    const r = endMonthScroll(s, LAYOUT)
    expect(r.change).toBe(1)
  })
})
