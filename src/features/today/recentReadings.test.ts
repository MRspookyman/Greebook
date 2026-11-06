import { describe, expect, it } from 'vitest'
import { recentReadings } from './recentReadings'

const readings = [
  { id: 'accepted', updated_at: '2026-11-06T12:00:00Z' },
  { id: 'reading', updated_at: '2026-11-06T10:00:00Z' },
  { id: 'older', updated_at: '2026-11-05T10:00:00Z' },
]

describe('recentReadings', () => {
  it('prioritizes the latest session over a newly accepted recommendation', () => {
    const result = recentReadings(readings, [
      { reading_id: 'reading', created_at: '2026-11-06T10:00:00Z' },
      { reading_id: 'older', created_at: '2026-11-05T10:00:00Z' },
      { reading_id: 'reading', created_at: '2026-11-04T10:00:00Z' },
    ])
    expect(result.map((reading) => reading.id)).toEqual(['reading', 'older', 'accepted'])
    expect(readings[0].id).toBe('accepted')
  })

  it('breaks matching activity timestamps by updated_at', () => {
    const result = recentReadings(
      readings,
      readings.map((reading) => ({
        reading_id: reading.id,
        created_at: '2026-11-01T10:00:00Z',
      })),
    )
    expect(result.map((reading) => reading.id)).toEqual(['accepted', 'reading', 'older'])
  })

  it('orders books without sessions by updated_at', () => {
    expect(recentReadings([...readings].reverse(), []).map((reading) => reading.id)).toEqual([
      'accepted',
      'reading',
      'older',
    ])
  })
})
