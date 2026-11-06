import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { useMe } from '@/features/auth/me'
import { qk, useReactions } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { REACTION_EMOJIS, type Reaction, type ReactionEmoji, type ReactionTarget } from '@/lib/types'
import { toast } from '@/components/toast'

const LONG_PRESS_MS = 380

/**
 * Reactions on my partner's things: tap for ❤️, long-press for ❤️ 🔥 📚 😂 😮 👏.
 * On my own things it shows read-only what my partner reacted.
 */
export function ReactionBar({
  targetType,
  targetId,
  ownerId,
}: {
  targetType: ReactionTarget
  targetId: string
  ownerId: string
}) {
  const { userId, partner } = useMe()
  const qc = useQueryClient()
  const { data = [] } = useReactions()
  const [picker, setPicker] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const press = useRef<{ timer: number; fired: boolean } | null>(null)
  const own = ownerId === userId
  const allowed = ownerId === partner?.id
  const reactions = data.filter((r) => r.target_type === targetType && r.target_id === targetId)
  const byEmoji = REACTION_EMOJIS.map((emoji) => ({
    emoji,
    list: reactions.filter((r) => r.emoji === emoji),
  })).filter((group) => group.list.length > 0)

  useEffect(() => {
    if (!picker) return
    const close = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setPicker(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [picker])

  useEffect(() => {
    if (picker) wrapper.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [picker])

  const toggle = useMutation({
    mutationFn: async ({ existing, next }: { existing?: Reaction; next: Reaction }) => {
      const { error } = existing
        ? await supabase.from('reactions').delete().eq('id', existing.id).eq('user_id', userId)
        : await supabase.from('reactions').insert(next)
      if (error) throw error
    },
    onMutate: async ({ existing, next }) => {
      await qc.cancelQueries({ queryKey: qk.reactions() })
      const previous = qc.getQueryData<Reaction[]>(qk.reactions())
      qc.setQueryData<Reaction[]>(qk.reactions(), (old = []) =>
        existing ? old.filter((r) => r.id !== existing.id) : [...old, next],
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      qc.setQueryData(qk.reactions(), context?.previous)
      toast('No se pudo guardar la reacción')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.reactions() }),
  })

  if (!own && !allowed) return null
  if (own) {
    if (!byEmoji.length) return null
    return (
      <div className="flex flex-wrap items-center gap-1" aria-label="Reacciones de tu pareja">
        {byEmoji.map(({ emoji, list }) => (
          <span
            key={emoji}
            className="flex min-h-8 items-center gap-1 rounded-full bg-soft px-2 text-xs"
            title={partner ? `${partner.display_name} reaccionó ${emoji}` : undefined}
          >
            <span aria-hidden>{emoji}</span>
            <span className="text-[11px] font-semibold text-muted">
              {list.length > 1 ? list.length : partner?.display_name.charAt(0)}
            </span>
          </span>
        ))}
      </div>
    )
  }

  function react(emoji: ReactionEmoji) {
    if (toggle.isPending) return
    const existing = reactions.find((r) => r.user_id === userId && r.emoji === emoji)
    toggle.mutate({
      existing,
      next: {
        id: crypto.randomUUID(),
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
        emoji,
        created_at: new Date().toISOString(),
      },
    })
  }

  const heart = reactions.find((r) => r.user_id === userId && r.emoji === '❤️')
  const others = byEmoji.filter((group) => group.emoji !== '❤️')
  return (
    <div ref={wrapper} className="relative flex items-center gap-1">
      <button
        type="button"
        ref={trigger}
        className={`flex min-h-11 min-w-11 select-none items-center justify-center gap-1 rounded-full border px-2.5 text-xs transition-transform duration-300 [-webkit-touch-callout:none] [transition-timing-function:var(--spring)] active:scale-90 ${
          heart
            ? 'border-transparent bg-[color-mix(in_oklab,var(--danger)_14%,var(--surface))] text-danger'
            : 'border-border text-muted'
        }`}
        aria-pressed={!!heart}
        aria-label={
          heart
            ? 'Quitar me gusta. Mantén pulsado o pulsa flecha arriba para otras reacciones'
            : 'Me gusta. Mantén pulsado o pulsa flecha arriba para otras reacciones'
        }
        aria-haspopup="menu"
        aria-expanded={picker}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || (event.key === 'Enter' && event.shiftKey)) {
            event.preventDefault()
            setPicker(true)
          }
          if (event.key === 'Enter' || event.key === ' ') press.current = null
        }}
        onPointerDown={() => {
          press.current = {
            fired: false,
            timer: window.setTimeout(() => {
              if (press.current) press.current.fired = true
              setPicker(true)
            }, LONG_PRESS_MS),
          }
        }}
        onPointerUp={() => press.current && window.clearTimeout(press.current.timer)}
        onPointerLeave={() => press.current && window.clearTimeout(press.current.timer)}
        onPointerCancel={() => press.current && window.clearTimeout(press.current.timer)}
        onContextMenu={(event) => {
          event.preventDefault()
          setPicker(true)
        }}
        onClick={() => {
          if (press.current?.fired) return
          react('❤️')
        }}
      >
        <Heart
          size={14}
          fill={heart ? 'currentColor' : 'none'}
          style={heart ? { animation: 'gb-pop 0.5s var(--spring)' } : undefined}
        />
      </button>
      {others.map(({ emoji, list }) => {
        const mine = list.some((r) => r.user_id === userId)
        return (
          <button
            key={emoji}
            type="button"
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-full border px-2 text-sm transition-transform duration-300 [transition-timing-function:var(--spring)] active:scale-90 ${mine ? 'border-transparent bg-soft' : 'border-border'}`}
            style={{ animation: 'gb-pop 0.45s var(--spring)' }}
            aria-pressed={mine}
            aria-label={mine ? `Quitar ${emoji}` : `Reaccionar ${emoji}`}
            onClick={() => react(emoji)}
          >
            {emoji}
          </button>
        )
      })}
      {picker && (
        <div
          role="menu"
          aria-label="Elegir reacción"
          className="absolute right-0 bottom-[calc(100%+6px)] z-20 flex gap-0.5 rounded-full border border-border bg-surface p-1 shadow-[0_12px_30px_-8px_rgb(0_0_0/0.3)]"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setPicker(false)
              trigger.current?.focus()
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault()
              const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
              const index = items.indexOf(document.activeElement as HTMLButtonElement)
              items[(index + (event.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length]?.focus()
            }
          }}
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitem"
              tabIndex={0}
              className={`grid h-11 w-11 place-items-center rounded-full text-[22px] transition-transform duration-200 [transition-timing-function:var(--spring)] hover:-translate-y-1 hover:scale-125 ${reactions.some((r) => r.user_id === userId && r.emoji === emoji) ? 'bg-soft' : ''}`}
              aria-label={emoji}
              onClick={() => {
                react(emoji)
                setPicker(false)
                trigger.current?.focus()
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
