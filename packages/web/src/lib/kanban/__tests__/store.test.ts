import { describe, expect, it } from 'vitest'
import { appendTicketNote } from '../store'

describe('appendTicketNote', () => {
  it('appends a timestamped update to an existing description', () => {
    const result = appendTicketNote(
      'Original context',
      'Need follow-up before dispatch.',
      new Date('2026-06-22T22:14:00.000Z'),
    )

    expect(result).toBe(
      'Original context\n\nUpdate (2026-06-22T22:14:00.000Z)\nNeed follow-up before dispatch.',
    )
  })

  it('creates a description from a note when the ticket was empty', () => {
    const result = appendTicketNote(
      '',
      'Fresh note',
      new Date('2026-06-22T22:14:00.000Z'),
    )

    expect(result).toBe('Update (2026-06-22T22:14:00.000Z)\nFresh note')
  })
})
