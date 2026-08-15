import { describe, expect, test } from 'bun:test'
import {
  beginDrag,
  createDragSession,
  endDrag,
  moveDrag,
  type DragContext,
  type DragTarget,
  type ScrollContainer,
} from './dragSession'

function target(opts: { excluded?: boolean; inside?: boolean } = {}): DragTarget {
  return {
    closest: () => (opts.excluded ? {} : null),
  }
}

function container(scrollTop: number, inside: boolean): ScrollContainer {
  return { scrollTop, contains: () => inside }
}

function ctx(scrollTop: number, inside: boolean, sheetHeight = 400): DragContext {
  return { container: container(scrollTop, inside), sheetHeight }
}

describe('dragSession', () => {
  test('배제 요소에서 시작하면 idle 유지', () => {
    const s = beginDrag(createDragSession(), target({ excluded: true }), 10)
    expect(s.state).toBe('idle')
  })

  test('아래로 10px 미만 이동은 pressed 유지, preventDefault 없음', () => {
    let s = beginDrag(createDragSession(), target(), 100)
    const r = moveDrag(s, 108, ctx(0, true))
    s = r.session
    expect(s.state).toBe('pressed')
    expect(r.preventDefault).toBe(false)
  })

  test('최상단에서 10px 이상 아래로 이동 시 dragging 전환 (takeover)', () => {
    let s = beginDrag(createDragSession(), target({ inside: true }), 100)
    s = moveDrag(s, 110, ctx(0, true)).session
    expect(s.state).toBe('dragging')
    expect(s.dragY).toBe(0)
  })

  test('takeover 시 preventDefault true', () => {
    const s = beginDrag(createDragSession(), target(), 100)
    const r = moveDrag(s, 110, ctx(0, true))
    expect(r.preventDefault).toBe(true)
  })

  test('위로 이동하면 pull 리셋, 이후 하강은 재누적', () => {
    let s = beginDrag(createDragSession(), target(), 100)
    s = moveDrag(s, 96, ctx(0, true)).session // up → pull 0
    s = moveDrag(s, 92, ctx(0, true)).session // up → pull 0
    s = moveDrag(s, 96, ctx(0, true)).session // down 4 → pull 4
    s = moveDrag(s, 100, ctx(0, true)).session // down 4 → pull 8 < 10
    expect(s.state).toBe('pressed')
    s = moveDrag(s, 106, ctx(0, true)).session // down 6 → pull 14 ≥ 10
    expect(s.state).toBe('dragging')
  })

  test('스크롤된 콘텐츠(최상단 아님)에서는 아래로 이동해도 takeover 없음', () => {
    let s = beginDrag(createDragSession(), target({ inside: true }), 100)
    s = moveDrag(s, 120, ctx(200, true)).session
    expect(s.state).toBe('pressed')
  })

  test('chain-pull: 스크롤이 최상단에 도달한 후 추가 하강으로 takeover', () => {
    let s = beginDrag(createDragSession(), target({ inside: true }), 100)
    // 스크롤업 구간 (scrollTop 200 → 0) — takeover 없음
    s = moveDrag(s, 90, ctx(200, true)).session
    s = moveDrag(s, 40, ctx(120, true)).session
    s = moveDrag(s, 10, ctx(40, true)).session
    expect(s.state).toBe('pressed')
    // 최상단 도달 후 하강 — 10px 누적되면 takeover
    s = moveDrag(s, 14, ctx(0, true)).session
    s = moveDrag(s, 20, ctx(0, true)).session
    expect(s.state).toBe('dragging')
    expect(s.dragY).toBe(0)
  })

  test('dragging 중 이동은 dragY가 손가락을 따라감', () => {
    let s = beginDrag(createDragSession(), target(), 100)
    s = moveDrag(s, 110, ctx(0, true)).session // takeover, origin 110
    const r = moveDrag(s, 150, ctx(0, true))
    s = r.session
    expect(s.dragY).toBe(40)
    expect(r.preventDefault).toBe(true)
  })

  test('dragging 중 위로 이동해도 0 아래로 내려가지 않음', () => {
    let s = beginDrag(createDragSession(), target(), 100)
    s = moveDrag(s, 120, ctx(0, true)).session
    s = moveDrag(s, 90, ctx(0, true)).session
    expect(s.dragY).toBe(0)
  })

  test('25% 초과 드래그 후 해제 시 close', () => {
    let s = beginDrag(createDragSession(), target(), 100)
    s = moveDrag(s, 110, ctx(0, true)).session // origin 110
    s = moveDrag(s, 220, ctx(0, true)).session // 110px > 400*0.25
    const r = endDrag(s, ctx(0, true))
    expect(r.close).toBe(true)
    expect(r.session.state).toBe('idle')
  })

  test('25% 미만 드래그 후 해제 시 close 아님 + 상태 리셋', () => {
    let s = beginDrag(createDragSession(), target(), 100)
    s = moveDrag(s, 110, ctx(0, true)).session
    s = moveDrag(s, 140, ctx(0, true)).session // 30px < 100
    const r = endDrag(s, ctx(0, true))
    expect(r.close).toBe(false)
    expect(r.session.state).toBe('idle')
  })

  test('pressed 상태에서 해제하면 close 아님', () => {
    const s = beginDrag(createDragSession(), target(), 100)
    const r = endDrag(s, ctx(0, true))
    expect(r.close).toBe(false)
  })

  test('스크롤 컨테이너 밖(헤더)에서 시작하면 scrollTop과 무관하게 takeover', () => {
    let s = beginDrag(createDragSession(), target({ inside: false }), 100)
    s = moveDrag(s, 120, ctx(500, false)).session
    expect(s.state).toBe('dragging')
  })

  test('컨테이너가 없으면 항상 최상단 취급', () => {
    let s = beginDrag(createDragSession(), target(), 100)
    s = moveDrag(s, 115, { container: null, sheetHeight: 400 }).session
    expect(s.state).toBe('dragging')
  })
})
