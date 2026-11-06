import { describe, expect, it, vi } from 'vitest'
import type { Invite } from '@/lib/types'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/queryClient', () => ({ queryClient: {} }))
vi.mock('@/lib/data', () => ({ qk: {} }))

import { isInviteExpired } from './ratito'

function invite(created: Date, starts: Date | null = null): Invite {
  return {
    id: 'invite',
    from_user: 'one',
    to_user: 'two',
    status: 'pending',
    created_at: created.toISOString(),
    starts_at: starts?.toISOString() ?? null,
    responded_at: null,
  }
}

describe('ratito expiry in the local calendar', () => {
  it('keeps an Ahora invitation until the end of its creation day', () => {
    const item = invite(new Date(2026, 10, 7, 9))
    expect(isInviteExpired(item, new Date(2026, 10, 7, 23, 59, 59, 999))).toBe(false)
    expect(isInviteExpired(item, new Date(2026, 10, 8))).toBe(true)
  })

  it('uses the scheduled day for a tomorrow invitation', () => {
    const item = invite(new Date(2026, 10, 7, 22), new Date(2026, 10, 8, 21, 30))
    expect(isInviteExpired(item, new Date(2026, 10, 8, 23, 59))).toBe(false)
    expect(isInviteExpired(item, new Date(2026, 10, 9))).toBe(true)
  })

  it('does not expire immediately when the scheduled hour passes', () => {
    const item = invite(new Date(2026, 10, 7, 10), new Date(2026, 10, 7, 18))
    expect(isInviteExpired(item, new Date(2026, 10, 7, 21))).toBe(false)
  })
})
