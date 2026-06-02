// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortalCallRow {
  orig_id: string
  call_id: string        // term_id from the portal
  from_name?: string
  from_number?: string
  dialed_number?: string
  to_extension?: string
  duration_seconds?: number
  filename?: string      // WAV filename, if available
}

export interface ParsedCallMetadata {
  call_id_portal: string
  orig_id: string
  original_filename: string | null
  filename_timestamp_utc: string | null  // ISO 8601, UTC
  call_time_ct: string | null            // ISO 8601, UTC (the CT moment in UTC)
  call_date: string | null               // YYYY-MM-DD in Central time
  direction: 'inbound' | 'outbound' | 'unknown'
  from_name: string | null
  from_number: string | null
  dialed_number: string | null
  to_extension: string | null
  duration_seconds: number
}

// ─── Term ID parsing ──────────────────────────────────────────────────────────

/**
 * Parse a portal term_id (format: YYYYMMDDHHmmss + opaque suffix, Central time)
 * and return the equivalent UTC Date plus the call's local date in CT.
 *
 * Why two-step offset detection: JS has no native "parse this local time in
 * timezone X" API, so we treat the CT string as UTC, derive the CT→UTC offset
 * via Intl, then apply it. One-pass approximation is accurate except within
 * the DST fold hour (~1 hr/year), acceptable for a call-log use case.
 */
export function parseTermId(termId: string): { callTimeCt: Date | null; callDate: string | null } {
  if (!termId || termId.length < 14) return { callTimeCt: null, callDate: null }
  const raw = termId.slice(0, 14)
  if (!/^\d{14}$/.test(raw)) return { callTimeCt: null, callDate: null }

  const year  = +raw.slice(0, 4)
  const month = +raw.slice(4, 6)
  const day   = +raw.slice(6, 8)
  const hour  = +raw.slice(8, 10)
  const min   = +raw.slice(10, 12)
  const sec   = +raw.slice(12, 14)

  const naiveUtc   = new Date(Date.UTC(year, month - 1, day, hour, min, sec))
  const ctOffsetMs = getCtOffsetMs(naiveUtc)      // e.g., -18000000 for CDT (UTC-5)
  const callTimeCt = new Date(naiveUtc.getTime() - ctOffsetMs)
  const callDate   = formatDateCt(callTimeCt)

  return { callTimeCt, callDate }
}

/** Returns how many ms CT is behind UTC for a given UTC moment (always negative). */
function getCtOffsetMs(utcDate: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false,
    })
      .formatToParts(utcDate)
      .map(p => [p.type, p.value]),
  )
  const h   = +parts.hour === 24 ? 0 : +parts.hour
  const ctMs = Date.UTC(+parts.year, +parts.month - 1, +parts.day, h, +parts.minute, +parts.second)
  return ctMs - utcDate.getTime()
}

/** Format a UTC Date as YYYY-MM-DD in Central time. */
function formatDateCt(utcDate: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(utcDate)
}

// ─── WAV filename parsing ─────────────────────────────────────────────────────

/**
 * Parse a Voice for Pest WAV filename.
 * Format: aud-{YYYYMMDDHHmmss}{microseconds}-{hash}-{token}.wav
 * The 14-digit timestamp prefix is UTC.
 */
export function parseWavFilename(filename: string): { filenameTimestampUtc: Date | null } {
  if (!filename) return { filenameTimestampUtc: null }
  const match = filename.match(/^aud-(\d{14})/)
  if (!match) return { filenameTimestampUtc: null }

  const raw   = match[1]
  const year  = +raw.slice(0, 4)
  const month = +raw.slice(4, 6)
  const day   = +raw.slice(6, 8)
  const hour  = +raw.slice(8, 10)
  const min   = +raw.slice(10, 12)
  const sec   = +raw.slice(12, 14)

  return { filenameTimestampUtc: new Date(Date.UTC(year, month - 1, day, hour, min, sec)) }
}

// ─── Duration parsing ─────────────────────────────────────────────────────────

/** Convert "M:SS" or "MM:SS" duration string to integer seconds. Returns 0 on failure. */
export function parseDuration(s: string): number {
  if (!s) return 0
  const parts = s.split(':')
  if (parts.length !== 2) return 0
  const mins = parseInt(parts[0], 10)
  const secs = parseInt(parts[1], 10)
  if (isNaN(mins) || isNaN(secs)) return 0
  return mins * 60 + secs
}

// ─── Phone number normalization ───────────────────────────────────────────────

/**
 * Normalize a phone number to bare digits.
 * - 10 digits → returned as-is (US local)
 * - 11 digits starting with 1 → strip leading 1
 * - ≤5 digits → treated as an internal extension, returned as-is
 * - Anything else → null
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  if (digits.length === 10) return digits
  if (digits.length >= 1 && digits.length <= 5) return digits
  return null
}

// ─── Direction inference ──────────────────────────────────────────────────────

const SHORT_EXTENSION = /^\d{1,5}$/

/**
 * Infer call direction from portal metadata.
 * Inbound:  external caller (10+ digits) → internal extension (≤5 digits)
 * Outbound: internal extension (≤5 digits) → external number (10+ digits)
 */
export function inferDirection(
  fromNumber: string | undefined,
  dialedNumber: string | undefined,
  toExtension: string | undefined,
): 'inbound' | 'outbound' | 'unknown' {
  const from   = (fromNumber  ?? '').replace(/\D/g, '')
  const dialed = (dialedNumber ?? '').replace(/\D/g, '')
  const ext    = (toExtension  ?? '').replace(/\D/g, '')

  if (from.length >= 10 && SHORT_EXTENSION.test(ext))   return 'inbound'
  if (dialed.length >= 10 && SHORT_EXTENSION.test(from)) return 'outbound'

  return 'unknown'
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/** Combine all parsers to build a call record ready for the `calls` table insert. */
export function buildCallRecord(row: PortalCallRow): ParsedCallMetadata {
  const { callTimeCt, callDate } = parseTermId(row.call_id)
  const { filenameTimestampUtc } = row.filename
    ? parseWavFilename(row.filename)
    : { filenameTimestampUtc: null }

  return {
    call_id_portal:          row.call_id,
    orig_id:                 row.orig_id,
    original_filename:       row.filename ?? null,
    filename_timestamp_utc:  filenameTimestampUtc?.toISOString() ?? null,
    call_time_ct:            callTimeCt?.toISOString() ?? null,
    call_date:               callDate,
    direction:               inferDirection(row.from_number, row.dialed_number, row.to_extension),
    from_name:               row.from_name ?? null,
    from_number:             normalizePhoneNumber(row.from_number ?? ''),
    dialed_number:           normalizePhoneNumber(row.dialed_number ?? ''),
    to_extension:            row.to_extension ?? null,
    duration_seconds:        row.duration_seconds ?? 0,
  }
}
