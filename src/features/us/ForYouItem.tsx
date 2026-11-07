import { GoalProposal } from './MemoriesCard'
import { InviteCard } from './InviteCard'
import { MessageCard } from './MessageCard'
import type { PendingItem } from './messages'
import { TogetherCard } from './TogetherCard'

/** One thing your partner left for you, answerable right where it is shown. */
export function ForYouItem({ item, preview = false }: { item: PendingItem; preview?: boolean }) {
  switch (item.type) {
    case 'message':
      return <MessageCard message={item.message} preview={preview} />
    case 'invite':
      return <InviteCard invite={item.invite} compact />
    case 'together':
      return (
        <div className="rule py-4">
          <TogetherCard item={item.item} />
        </div>
      )
    case 'goal':
      return (
        <div className="rule py-4">
          <GoalProposal goal={item.goal} />
        </div>
      )
  }
}

/** Stable key for a pending item. */
export function forYouKey(item: PendingItem): string {
  switch (item.type) {
    case 'message':
      return `m-${item.message.id}`
    case 'invite':
      return `i-${item.invite.id}`
    case 'together':
      return `t-${item.item.id}`
    case 'goal':
      return `g-${item.goal.month}`
  }
}
