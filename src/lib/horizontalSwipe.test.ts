import { describe, expect, test } from 'bun:test'
import { beginSwipe, createSwipeSession, endSwipe, moveSwipe } from './horizontalSwipe'

describe('horizontalSwipe', () => {
  test('가로 우세 확정 시 dx 추적 시작', () => {
    let s = beginSwipe(createSwipeSession(), 100, 100)
    const r = moveSwipe(s, 120, 103)
    s = r.session
    expect(s.state).toBe('horizontal')
    expect(r.dx).toBe(20)
  })

  test('세로 우세 확정 시 dx 무시 (스크롤 양보)', () => {
    let s = beginSwipe(createSwipeSession(), 100, 100)
    s = moveSwipe(s, 103, 130).session
    expect(s.state).toBe('vertical')
    const r = moveSwipe(s, 160, 160)
    expect(r.dx).toBe(0)
    expect(r.session.state).toBe('vertical')
  })

  test('대각선도 더 큰 축으로 확정', () => {
    let s = beginSwipe(createSwipeSession(), 100, 100)
    s = moveSwipe(s, 120, 110).session
    expect(s.state).toBe('horizontal')
    let s2 = beginSwipe(createSwipeSession(), 100, 100)
    s2 = moveSwipe(s2, 110, 120).session
    expect(s2.state).toBe('vertical')
  })

  test('우세 확정 전 작은 이동은 pressed 유지', () => {
    let s = beginSwipe(createSwipeSession(), 100, 100)
    s = moveSwipe(s, 104, 101).session
    expect(s.state).toBe('pressed')
    expect(s.dx).toBe(0)
  })

  test('dx는 ±96으로 클램프', () => {
    let s = beginSwipe(createSwipeSession(), 100, 100)
    s = moveSwipe(s, 100, 100).session // dominance 확정 필요
    s = moveSwipe(s, 200, 100).session
    expect(s.dx).toBe(96)
  })

  test('왼쪽 스와이프 60px 이상이면 change -1', () => {
    let s = beginSwipe(createSwipeSession(), 100, 100)
    s = moveSwipe(s, 100, 100).session
    s = moveSwipe(s, 30, 100).session
    const r = endSwipe(s)
    expect(r.change).toBe(-1)
  })

  test('오른쪽 스와이프 60px 이상이면 change +1', () => {
    let s = beginSwipe(createSwipeSession(), 100, 100)
    s = moveSwipe(s, 100, 100).session
    s = moveSwipe(s, 180, 100).session
    const r = endSwipe(s)
    expect(r.change).toBe(1)
  })

  test('임계값 미만이면 change 0', () => {
    let s = beginSwipe(createSwipeSession(), 100, 100)
    s = moveSwipe(s, 100, 100).session
    s = moveSwipe(s, 140, 100).session
    const r = endSwipe(s)
    expect(r.change).toBe(0)
  })

  test('pressed 상태에서 해제하면 change 0 + 세션 리셋', () => {
    const s = beginSwipe(createSwipeSession(), 100, 100)
    const r = endSwipe(s)
    expect(r.change).toBe(0)
    expect(r.session.state).toBe('idle')
  })

  test('세로 확정 후 해제는 change 0', () => {
    let s = beginSwipe(createSwipeSession(), 100, 100)
    s = moveSwipe(s, 103, 140).session
    const r = endSwipe(s)
    expect(r.change).toBe(0)
  })

  test('idle 상태의 move는 무시', () => {
    const r = moveSwipe(createSwipeSession(), 200, 200)
    expect(r.dx).toBe(0)
  })
})
