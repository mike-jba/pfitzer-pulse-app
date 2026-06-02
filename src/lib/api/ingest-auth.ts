/** Validates the Authorization: Bearer <INGEST_SECRET> header on ingest routes. */
export function validateIngestAuth(request: Request): boolean {
  const auth = request.headers.get('Authorization')
  if (!auth) return false
  const parts = auth.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return false
  return parts[1] === process.env.INGEST_SECRET
}
