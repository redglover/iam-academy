import type { Tone } from '../data/types'

export const toneText: Record<Tone, string> = {
  key: 'text-key',
  join: 'text-join',
  move: 'text-move',
  leave: 'text-leave',
  auto: 'text-auto',
}
export const toneBg: Record<Tone, string> = {
  key: 'bg-key',
  join: 'bg-join',
  move: 'bg-move',
  leave: 'bg-leave',
  auto: 'bg-auto',
}
export const toneSoft: Record<Tone, string> = {
  key: 'bg-key/10 border-key/30',
  join: 'bg-join/10 border-join/30',
  move: 'bg-move/10 border-move/30',
  leave: 'bg-leave/10 border-leave/30',
  auto: 'bg-auto/10 border-auto/30',
}
export const toneTint: Record<Tone, string> = {
  key: 'bg-key/15',
  join: 'bg-join/15',
  move: 'bg-move/15',
  leave: 'bg-leave/15',
  auto: 'bg-auto/15',
}
