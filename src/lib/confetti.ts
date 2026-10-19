import confetti from 'canvas-confetti'

export function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#2F5BFF', '#129668', '#D68C06', '#DE3C42', '#7C5CFF']
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors, disableForReducedMotion: true })
}
