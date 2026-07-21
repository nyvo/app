import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installChunkReloadHandler } from './chunk-reload'

function firePreloadError() {
  window.dispatchEvent(new Event('vite:preloadError'))
}

describe('installChunkReloadHandler', () => {
  let reload: ReturnType<typeof vi.fn<() => void>>
  let uninstall: () => void

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    sessionStorage.clear()
    reload = vi.fn<() => void>()
    uninstall = installChunkReloadHandler(reload)
  })

  afterEach(() => {
    uninstall()
    vi.useRealTimers()
  })

  it('reloads on the first chunk load failure', () => {
    firePreloadError()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload again within the guard window (broken deploy)', () => {
    firePreloadError()
    vi.advanceTimersByTime(5_000)
    firePreloadError()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads again once the guard window has passed', () => {
    firePreloadError()
    vi.advanceTimersByTime(31_000)
    firePreloadError()
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('respects a guard timestamp persisted by a previous page load', () => {
    // Simulate the state right after an auto-reload: the pre-reload page
    // stamped sessionStorage, this "new" page installs a fresh handler.
    firePreloadError()
    uninstall()
    const freshReload = vi.fn<() => void>()
    uninstall = installChunkReloadHandler(freshReload)
    firePreloadError()
    expect(freshReload).not.toHaveBeenCalled()
  })
})
