# Security Notes

This document records security risks, controls, and accepted-risk positions for Pfitzer Pulse.

---

## SEC-01: Unauthenticated Audit API Endpoints

**Status:** Resolved — milestone v2, plan 01-02 (2026-06-03)

**Risk:** `/api/audit/run` and `/api/audit/call-count` accepted requests with no authentication,
allowing any external actor who discovered the URL to trigger expensive Claude API calls and
read internal call counts.

**Resolution:** Converted audit operations to Next.js Server Actions (`src/lib/actions/audit.ts`).
The public API routes were deleted entirely. Server actions execute server-to-server with no
client-exposed secret; there is no longer a public HTTP surface for these operations.

---

## SEC-02: n8n Credential Exposure Risk

**Status:** Accepted risk — milestone v2 (2026-06-03)

### Risk Description

The self-hosted n8n instance on `automation.joystoneenterprises.com` holds the following
credentials in its internal credential store:

- **Portal credentials:** username and password for `portal.atscall.me`
- **Deepgram API key:** used for call transcription
- **Anthropic API key:** used for call analysis and daily recap generation
- **INGEST_SECRET:** shared Bearer token for n8n → Next.js API route authentication
- **Supabase service role key:** provides full database access bypassing Row Level Security

These credentials are required for the automated nightly ingestion and recap workflows.

### Controls in Place

1. **Private VPS:** The n8n instance runs on a Hostinger VPS behind login authentication.
   No credential values are visible to unauthenticated users.

2. **Workflow JSON not committed:** Exported workflow JSON files (which contain credentials
   in plaintext in some node configurations) are excluded from the backup repository via
   `.gitignore` and are never committed to version control or shared externally.

3. **Credential store, not node params:** Where possible, credentials are stored in n8n's
   native credential store rather than hardcoded into workflow node parameters, reducing
   exposure in the workflow JSON export format.

4. **INGEST_SECRET validated server-side:** All Next.js ingest routes validate the
   `Authorization: Bearer <INGEST_SECRET>` header before processing any payload.

### Residual Risk

- **Execution logs:** n8n execution logs may surface header values set via Code nodes
  (e.g., `Authorization: Bearer ...`). If an attacker gained read access to the n8n instance,
  execution logs could expose the INGEST_SECRET and Anthropic/Deepgram keys.

- **Exported workflow file:** If a workflow JSON export were shared off-platform (e.g.,
  emailed, stored in a public location), it would contain all credentials referenced in
  Code node parameters in plaintext. No current process prevents accidental export-and-share.

- **n8n instance compromise:** A compromised n8n admin account would give full access to
  all stored credentials.

### Accepted-Risk Position

For milestone v2, this residual risk is **accepted** because:

- The n8n instance is private and not publicly indexed.
- Access requires valid login credentials known only to the project operators.
- No workflow JSON is committed to version control or shared.
- The affected systems (pest control call data, transcripts) carry low-to-medium sensitivity;
  the primary risk is API cost abuse and data exposure, not safety-critical impact.

### Mitigations to Revisit in v3

1. Move secrets from Code node literal strings to n8n environment variables / expressions
   so they do not appear in exported workflow JSON or execution input logs.
2. Audit execution-log retention settings; consider disabling log storage for nodes that
   handle sensitive headers.
3. Enable n8n 2FA on the admin account.
4. Rotate all keys on a defined schedule (quarterly recommended).

### Sign-Off

**Accepted by:** Garret Pfitzer (owner/operator) and Mike Sorenson (project lead)
**Date:** 2026-06-03
**Review due:** Start of milestone v3
