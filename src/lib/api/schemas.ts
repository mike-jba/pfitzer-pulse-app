import { z } from 'zod'

export const processingStatusSchema = z.enum([
  'discovered',
  'metadata_saved',
  'audio_downloaded',
  'audio_converted',
  'transcribing',
  'transcribed',
  'analyzing',
  'analyzed',
  'complete',
  'failed',
  'skipped_duplicate',
])

export const callDirectionSchema = z.enum(['inbound', 'outbound', 'unknown'])

export const callSentimentSchema = z.enum(['positive', 'neutral', 'negative', 'unknown'])

// Controlled category list — AI must only use these values.
export const VALID_CATEGORIES = [
  'New Customer / Sales Opportunity',
  'Scheduling',
  'Rescheduling',
  'Billing / Invoice',
  'Payment',
  'Complaint',
  'Compliment',
  'Service Question',
  'Pest Activity',
  'Technician Follow-up',
  'Cancellation / Retention',
  'Vendor / Internal',
  'Voicemail',
  'Other',
] as const

export const primaryCategorySchema = z.enum(VALID_CATEGORIES)
