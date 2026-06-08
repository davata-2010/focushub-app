// Best-effort, side-effect-only notifications for Pomodoro phase changes.
// Everything here is guarded so it never throws during build or in
// restricted environments.

export function requestNotificationPermission(): void {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  } catch {
    /* notifications unavailable — ignore */
  }
}

export function notifyPhase(message: string): void {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('FocusHub', { body: message, icon: '/favicon.svg' })
    }
  } catch {
    /* ignore */
  }
  playChime()
}

function playChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
    osc.onended = () => void ctx.close()
  } catch {
    /* audio unavailable — ignore */
  }
}
