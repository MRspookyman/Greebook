import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMe } from '@/features/auth/me'
import { qk, useReactions } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import type { Reaction } from '@/lib/types'
import { toast } from '@/components/toast'
import { HeartButton } from '@/components/HeartButton'

export function ReactionBar({
  targetType,
  targetId,
  ownerId,
}: {
  targetType: 'session' | 'reading'
  targetId: string
  ownerId: string
}) {
  const { userId, partner } = useMe()
  const qc = useQueryClient()
  const { data = [] } = useReactions()
  const own = ownerId === userId
  const allowed = ownerId === partner?.id
  const reactions = data.filter((r) => r.target_type === targetType && r.target_id === targetId && r.emoji === '❤️')
  const mine = reactions.find((reaction) => reaction.user_id === userId)
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
  if ((!own && !allowed) || (own && !reactions.length)) return null
  return (
    <div className="inline-flex items-center [&_button]:min-h-11">
      <HeartButton
        on={own ? reactions.length > 0 : !!mine}
        count={reactions.length}
        label={mine ? 'Quitar me gusta' : 'Me gusta'}
        onToggle={
          own
            ? undefined
            : () => {
                if (toggle.isPending) return
                toggle.mutate({
                  existing: mine,
                  next: {
                    id: crypto.randomUUID(),
                    user_id: userId,
                    target_type: targetType,
                    target_id: targetId,
                    emoji: '❤️',
                    created_at: new Date().toISOString(),
                  },
                })
              }
        }
      />
    </div>
  )
}
