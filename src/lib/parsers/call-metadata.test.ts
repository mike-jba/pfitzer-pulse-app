import {
  parseTermId,
  parseWavFilename,
  parseDuration,
  normalizePhoneNumber,
  inferDirection,
  buildCallRecord,
} from './call-metadata'

// ─── parseTermId ──────────────────────────────────────────────────────────────

describe('parseTermId', () => {
  it('converts CDT (UTC-5) to UTC — May date', () => {
    // 2026-05-20 20:11:58 CDT → 2026-05-21 01:11:58 UTC
    const { callTimeCt, callDate } = parseTermId('20260520201158012345abc')
    expect(callTimeCt?.toISOString()).toBe('2026-05-21T01:11:58.000Z')
    expect(callDate).toBe('2026-05-20')
  })

  it('converts CST (UTC-6) to UTC — January date', () => {
    // 2026-01-15 14:30:00 CST → 2026-01-15 20:30:00 UTC
    const { callTimeCt, callDate } = parseTermId('20260115143000xyz')
    expect(callTimeCt?.toISOString()).toBe('2026-01-15T20:30:00.000Z')
    expect(callDate).toBe('2026-01-15')
  })

  it('call_date reflects CT date, not UTC date (near-midnight CDT)', () => {
    // 2026-06-01 23:30:00 CDT = 2026-06-02 04:30:00 UTC
    // call_date should be '2026-06-01', not '2026-06-02'
    const { callTimeCt, callDate } = parseTermId('20260601233000')
    expect(callTimeCt?.toISOString()).toBe('2026-06-02T04:30:00.000Z')
    expect(callDate).toBe('2026-06-01')
  })

  it('returns null for input shorter than 14 chars', () => {
    const { callTimeCt, callDate } = parseTermId('2026052')
    expect(callTimeCt).toBeNull()
    expect(callDate).toBeNull()
  })

  it('returns null for non-numeric prefix', () => {
    const { callTimeCt } = parseTermId('abcdefghijklmnop')
    expect(callTimeCt).toBeNull()
  })

  it('returns null for empty string', () => {
    const { callTimeCt } = parseTermId('')
    expect(callTimeCt).toBeNull()
  })
})

// ─── parseWavFilename ─────────────────────────────────────────────────────────

describe('parseWavFilename', () => {
  it('extracts UTC timestamp from a standard filename', () => {
    const { filenameTimestampUtc } = parseWavFilename('aud-20260519200459047604-abc123-xyz.wav')
    expect(filenameTimestampUtc?.toISOString()).toBe('2026-05-19T20:04:59.000Z')
  })

  it('returns null for a non-matching filename', () => {
    const { filenameTimestampUtc } = parseWavFilename('recording-unknown.wav')
    expect(filenameTimestampUtc).toBeNull()
  })

  it('returns null for an empty string', () => {
    const { filenameTimestampUtc } = parseWavFilename('')
    expect(filenameTimestampUtc).toBeNull()
  })
})

// ─── parseDuration ────────────────────────────────────────────────────────────

describe('parseDuration', () => {
  it('parses single-digit minute M:SS', () => expect(parseDuration('2:35')).toBe(155))
  it('parses two-digit minute MM:SS', () => expect(parseDuration('12:30')).toBe(750))
  it('parses 0:00', () => expect(parseDuration('0:00')).toBe(0))
  it('parses 0:45', () => expect(parseDuration('0:45')).toBe(45))
  it('returns 0 for empty string', () => expect(parseDuration('')).toBe(0))
  it('returns 0 for no-colon string', () => expect(parseDuration('abc')).toBe(0))
  it('returns 0 for non-numeric parts', () => expect(parseDuration('a:bc')).toBe(0))
})

// ─── normalizePhoneNumber ─────────────────────────────────────────────────────

describe('normalizePhoneNumber', () => {
  it('passes through a bare 10-digit number', () => {
    expect(normalizePhoneNumber('3195551234')).toBe('3195551234')
  })

  it('strips formatting characters', () => {
    expect(normalizePhoneNumber('(319) 555-1234')).toBe('3195551234')
  })

  it('strips +1 country code from 11-digit number', () => {
    expect(normalizePhoneNumber('+13195551234')).toBe('3195551234')
  })

  it('passes through a short internal extension', () => {
    expect(normalizePhoneNumber('101')).toBe('101')
  })

  it('passes through a 4-digit extension', () => {
    expect(normalizePhoneNumber('1234')).toBe('1234')
  })

  it('returns null for empty string', () => {
    expect(normalizePhoneNumber('')).toBeNull()
  })

  it('returns null for an unrecognizable length (7 digits)', () => {
    expect(normalizePhoneNumber('5551234')).toBeNull()
  })
})

// ─── inferDirection ───────────────────────────────────────────────────────────

describe('inferDirection', () => {
  it('identifies inbound: external caller → agent extension', () => {
    expect(inferDirection('3195551234', '5155559000', '101')).toBe('inbound')
  })

  it('identifies outbound: extension → external number', () => {
    expect(inferDirection('101', '3195551234', '3195551234')).toBe('outbound')
  })

  it('returns unknown when both sides look external', () => {
    expect(inferDirection('3195551234', '5155559000', '3195550000')).toBe('unknown')
  })

  it('returns unknown for empty inputs', () => {
    expect(inferDirection('', '', '')).toBe('unknown')
  })

  it('returns unknown for undefined inputs', () => {
    expect(inferDirection(undefined, undefined, undefined)).toBe('unknown')
  })
})

// ─── buildCallRecord ──────────────────────────────────────────────────────────

describe('buildCallRecord', () => {
  const baseRow = {
    orig_id:          'orig-abc',
    call_id:          '20260520201158012345abc',
    from_name:        'John Smith',
    from_number:      '3195551234',
    dialed_number:    '5155559000',
    to_extension:     '101',
    duration_seconds: 155,
    filename:         'aud-20260519200459047604-abc-xyz.wav',
  }

  it('builds a complete call record from a full portal row', () => {
    const result = buildCallRecord(baseRow)
    expect(result.call_id_portal).toBe('20260520201158012345abc')
    expect(result.orig_id).toBe('orig-abc')
    expect(result.call_time_ct).toBe('2026-05-21T01:11:58.000Z')
    expect(result.call_date).toBe('2026-05-20')
    expect(result.filename_timestamp_utc).toBe('2026-05-19T20:04:59.000Z')
    expect(result.original_filename).toBe('aud-20260519200459047604-abc-xyz.wav')
    expect(result.direction).toBe('inbound')
    expect(result.from_name).toBe('John Smith')
    expect(result.from_number).toBe('3195551234')
    expect(result.dialed_number).toBe('5155559000')
    expect(result.to_extension).toBe('101')
    expect(result.duration_seconds).toBe(155)
  })

  it('handles a row with no filename', () => {
    const { filename: _, ...rowWithoutFile } = baseRow
    const result = buildCallRecord(rowWithoutFile)
    expect(result.original_filename).toBeNull()
    expect(result.filename_timestamp_utc).toBeNull()
  })

  it('handles missing optional fields gracefully', () => {
    const result = buildCallRecord({ orig_id: 'o1', call_id: '20260115143000' })
    expect(result.from_name).toBeNull()
    expect(result.from_number).toBeNull()
    expect(result.direction).toBe('unknown')
    expect(result.duration_seconds).toBe(0)
  })
})
