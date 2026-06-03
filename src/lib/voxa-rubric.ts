export type VoxaSection =
  | 'Enthusiasm'
  | 'Engage'
  | 'Empathy'
  | 'Encourage'
  | 'Booking Strategy'
  | 'Educate'
  | 'Extra Mile'
  | 'Bonus'

export type VoxaCriterion = {
  id: number
  label: string
  section: VoxaSection
  max_score: 1
  weight: 1
  na_guidance: string
}

export const VOXA_RUBRIC_NAME = 'Voxa DNA Framework v1'

export const VOXA_SECTIONS: VoxaSection[] = [
  'Enthusiasm',
  'Engage',
  'Empathy',
  'Encourage',
  'Booking Strategy',
  'Educate',
  'Extra Mile',
  'Bonus',
]

export const VOXA_CRITERIA: VoxaCriterion[] = [
  {
    id: 1,
    label: 'Unique Greeting',
    section: 'Enthusiasm',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA only if call begins mid-conversation with no audible greeting opportunity.',
  },
  {
    id: 2,
    label: 'Positive Energy & Tone',
    section: 'Enthusiasm',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call.',
  },
  {
    id: 3,
    label: "Ask Customer's Name",
    section: 'Enthusiasm',
    max_score: 1,
    weight: 1,
    na_guidance: "NA if caller is a known repeat customer and agent already knows their name.",
  },
  {
    id: 4,
    label: 'Double Intro — Opening',
    section: 'Enthusiasm',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA if call is very brief (under 60 seconds) with no natural opportunity.',
  },
  {
    id: 5,
    label: 'Ask Questions About the Issue (3–5)',
    section: 'Engage',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA for payment-only calls or calls where customer is purely scheduling a known appointment with no new issue.',
  },
  {
    id: 6,
    label: 'Show Interest in the Customer',
    section: 'Engage',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call.',
  },
  {
    id: 7,
    label: 'Connect with Customer / Build Rapport',
    section: 'Empathy',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA only for very short transactional calls under 90 seconds.',
  },
  {
    id: 8,
    label: 'Validate the Customer',
    section: 'Empathy',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA if customer expresses no frustration or concern to validate.',
  },
  {
    id: 9,
    label: "Use Customer's Name During Call",
    section: 'Empathy',
    max_score: 1,
    weight: 1,
    na_guidance: "NA if agent was unable to obtain the customer's name (criterion 3 was NA).",
  },
  {
    id: 10,
    label: 'Use Positive Words',
    section: 'Encourage',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call.',
  },
  {
    id: 11,
    label: 'Reassure with Confidence',
    section: 'Encourage',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA only for very brief transactional calls where there is no uncertainty to address.',
  },
  {
    id: 12,
    label: 'Gather Customer Information',
    section: 'Booking Strategy',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA for calls from existing customers where all info is already on file and no booking occurred.',
  },
  {
    id: 13,
    label: 'Upgrade List / Fast-Track Support',
    section: 'Booking Strategy',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment calls, follow-up calls, complaint calls, and any call that did not involve scheduling a new service.',
  },
  {
    id: 14,
    label: 'Hail Mary',
    section: 'Booking Strategy',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA unless a booking opportunity was lost — only applies when customer declined to book and agent had a chance to make a final attempt.',
  },
  {
    id: 15,
    label: 'Share Your Goal',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment-only calls, brief scheduling calls, or technician follow-up calls with no sales/education component.',
  },
  {
    id: 16,
    label: 'Deliver Company Value Proposition',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment-only calls or calls from existing customers who are not inquiring about services.',
  },
  {
    id: 17,
    label: 'Explain Application Style & Treatment Areas',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment calls, billing calls, or calls where no service discussion occurred.',
  },
  {
    id: 18,
    label: 'Explain Products & Safety',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment calls, scheduling follow-ups, or calls where no treatment was discussed.',
  },
  {
    id: 19,
    label: 'Set Expectations / Explain Process with Tech',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment-only calls. NA if no appointment was scheduled.',
  },
  {
    id: 20,
    label: 'Offer Proposal + Offer Price',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment calls, follow-up scheduling, or calls where pricing was not relevant.',
  },
  {
    id: 21,
    label: 'Offer Additional Services',
    section: 'Extra Mile',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA if call was purely transactional (payment, quick scheduling) with no natural upsell opportunity.',
  },
  {
    id: 22,
    label: 'Offer or Review Membership Benefits',
    section: 'Extra Mile',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA if customer is already a member and membership was not discussed, or for very brief calls.',
  },
  {
    id: 23,
    label: 'Express Gratitude & Close Professionally',
    section: 'Extra Mile',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call.',
  },
  {
    id: 24,
    label: 'Double Outro — Closing',
    section: 'Extra Mile',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA only if call ended abruptly without a proper closing opportunity.',
  },
  {
    id: 25,
    label: 'Effort to Book the Call',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA for calls that are not new service inquiries (payments, technician follow-ups, existing scheduling).',
  },
  {
    id: 26,
    label: 'Effort to Apply the DNA Principles',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call as an overall holistic effort assessment.',
  },
  {
    id: 27,
    label: 'Overall Effort',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call.',
  },
  {
    id: 28,
    label: 'Educate First, Price Second (sequence matters)',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA if price was never discussed on this call.',
  },
  {
    id: 29,
    label: 'De-escalation Handling',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA unless customer was clearly upset, frustrated, or in conflict during the call.',
  },
  {
    id: 30,
    label: 'Navigate Objection',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA unless customer raised an explicit objection (price, timing, skepticism about service).',
  },
]
