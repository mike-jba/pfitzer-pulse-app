/**
 * Minimum call duration threshold for all data views.
 *
 * Calls at or below this value are excluded from the Call Explorer,
 * all dashboard KPIs, charts, and the recent-calls list.
 *
 * DASH-06: Filters out sub-threshold noise calls.
 * DASH-07: Serves as a duration proxy for "No Digit" robocall/hangup
 *   exclusion. No `release_cause` column exists in the DB (confirmed
 *   2026-06-03 against project jdoatvotmsmhrmpitzon). The 16–25s duration
 *   cluster (76 of 168 calls, 45%) is characteristic of IVR "No Digit"
 *   hangups. A true release_cause field would require n8n HTML re-parse +
 *   schema migration + full re-ingest — deferred to v3.
 *
 * Value: 25 seconds (calls must have duration_seconds > 25 to appear).
 */
export const MIN_CALL_DURATION_SECONDS = 25;
