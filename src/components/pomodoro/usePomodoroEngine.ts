import { useEffect } from 'react'
import { useStore } from '../../store/useStore'

/**
 * Drives the Pomodoro timer. Mounts a single interval while the timer is
 * running and tears it down on pause/unmount (the cleanup function).
 *
 * `tickTimer` derives the remaining time from a target timestamp stored in the
 * store, so the displayed time stays accurate even if individual ticks are
 * delayed or throttled (e.g. when the tab is backgrounded).
 */
export function usePomodoroEngine(): void {
  const isRunning = useStore((s) => s.pomodoro.isRunning)
  const tickTimer = useStore((s) => s.tickTimer)

  useEffect(() => {
    if (!isRunning) return
    tickTimer() // update immediately so the UI doesn't wait a full tick
    const id = setInterval(tickTimer, 250)
    return () => clearInterval(id)
  }, [isRunning, tickTimer])
}
