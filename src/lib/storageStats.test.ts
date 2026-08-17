import { describe, expect, test } from 'bun:test'
import { formatBytes, getStorageUsage, isPersisted, requestPersistence } from './storageStats'

interface StubManager {
  estimate?: () => Promise<{ usage?: number; quota?: number }>
  persisted?: () => Promise<boolean>
  persist?: () => Promise<boolean>
}

function stubNavigator(manager: StubManager | null) {
  Object.defineProperty(globalThis, 'navigator', {
    value: manager ? { storage: manager } : {},
    configurable: true,
  })
}

describe('formatBytes', () => {
  test('바이트는 그대로', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  test('KB는 소수 1자리', () => {
    expect(formatBytes(8.4 * 1024)).toBe('8.4 KB')
  })

  test('MB는 소수 1자리', () => {
    expect(formatBytes(1.25 * 1024 * 1024)).toBe('1.3 MB')
  })

  test('GB 경계: 1 GB 미만은 MB, 이상은 GB', () => {
    expect(formatBytes(1024 * 1024 * 1024 - 1)).toBe('1024.0 MB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB')
    expect(formatBytes(10 * 1024 * 1024 * 1024)).toBe('10.0 GB')
  })
})

describe('storage manager 헬퍼', () => {
  test('미지원 환경은 null', async () => {
    stubNavigator(null)
    expect(await getStorageUsage()).toBeNull()
    expect(await isPersisted()).toBeNull()
    expect(await requestPersistence()).toBeNull()
  })

  test('estimate 성공 시 usage/quota 반환', async () => {
    stubNavigator({
      estimate: async () => ({ usage: 123456, quota: 52428800 }),
    })
    expect(await getStorageUsage()).toEqual({ usage: 123456, quota: 52428800 })
  })

  test('persisted/persist 결과 전달', async () => {
    stubNavigator({
      persisted: async () => true,
      persist: async () => false,
    })
    expect(await isPersisted()).toBe(true)
    expect(await requestPersistence()).toBe(false)
  })

  test('estimate 실패는 null', async () => {
    stubNavigator({
      estimate: async () => {
        throw new Error('denied')
      },
    })
    expect(await getStorageUsage()).toBeNull()
  })
})
