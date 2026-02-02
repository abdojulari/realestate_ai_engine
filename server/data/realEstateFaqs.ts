export type FAQ = {
  id: number
  question: string
  answer: string
  tags: string[]
}

export const realEstateFaqs: FAQ[] = [
  {
    id: 1,
    question: 'What are the main steps to buying a home?',
    answer:
      'The typical flow is: initial consultation, pre-approval, property search, offer and negotiation, then closing.',
    tags: ['buying', 'process']
  },
  {
    id: 2,
    question: 'How long does it take to buy a home after an offer is accepted?',
    answer: 'A common timeline is 30–60 days from offer acceptance to closing.',
    tags: ['buying', 'timeline']
  },
  {
    id: 3,
    question: 'Do I need a mortgage pre-approval before shopping?',
    answer:
      'Pre-approval is strongly recommended. It gives you a lender-reviewed budget and can strengthen your offer.',
    tags: ['buying', 'mortgage']
  },
  {
    id: 4,
    question: 'How much home can I afford each month?',
    answer:
      'A common guideline is to keep total monthly housing expenses at or below about 33% of gross monthly income.',
    tags: ['affordability', 'mortgage']
  },
  {
    id: 5,
    question: 'What down payment is required in Canada?',
    answer:
      'Under $500,000: minimum 5% down. $500,000–$1.5M: 5% of first $500k + 10% of the remainder. Over $1.5M: 20% minimum.',
    tags: ['buying', 'mortgage']
  },
  {
    id: 6,
    question: 'How much should I budget for closing costs?',
    answer:
      'Plan for about 1.5%–4% of the purchase price for closing costs, depending on province and financing.',
    tags: ['buying', 'closing']
  },
  {
    id: 7,
    question: 'What is the difference between pre-qualification and pre-approval?',
    answer:
      'Pre-qualification is a quick estimate based on self-reported info. Pre-approval is lender-reviewed and often includes a rate hold.',
    tags: ['mortgage', 'buying']
  },
  {
    id: 8,
    question: 'What market data do you provide?',
    answer:
      'The market overview includes city and neighborhood analytics, pricing trends, and inventory snapshots across Alberta.',
    tags: ['market', 'analytics']
  },
  {
    id: 9,
    question: 'Do you provide MLS listings?',
    answer: 'Yes. The platform provides access to current MLS listings and detailed property data.',
    tags: ['mls', 'listings']
  },
  {
    id: 10,
    question: 'How does AI property search work?',
    answer:
      'Describe your lifestyle and requirements in plain English. The system parses your request and returns curated matches.',
    tags: ['ai-search', 'search']
  },
  {
    id: 11,
    question: 'Can I search by city or neighborhood?',
    answer:
      'Yes. You can filter by city and neighborhood, then refine by price, beds, baths, and features.',
    tags: ['search', 'neighborhoods']
  },
  {
    id: 12,
    question: 'How do property alerts work?',
    answer:
      'Alerts notify you when new listings match your criteria. Creating alerts requires marketing consent, and you can unsubscribe anytime.',
    tags: ['alerts', 'search']
  },
  {
    id: 13,
    question: 'How do I schedule a viewing?',
    answer:
      'Open a property detail page and use the schedule viewing option, or contact the listing agent directly.',
    tags: ['viewing', 'properties']
  },
  {
    id: 14,
    question: 'What details are shown on a property page?',
    answer:
      'You will see pricing, beds, baths, photos, features, utilities, neighborhood highlights, nearby schools, and payment estimates.',
    tags: ['properties', 'details']
  },
  {
    id: 15,
    question: 'What is the typical selling process?',
    answer:
      'The process includes market research, choosing an agent, preparing the home, verifying finances, professional media, and showings.',
    tags: ['selling', 'process']
  },
  {
    id: 16,
    question: 'How should I prepare my home before listing?',
    answer:
      'Focus on decluttering, cosmetic fixes, and staging so buyers can picture themselves in the space.',
    tags: ['selling', 'staging']
  },
  {
    id: 17,
    question: 'How do home valuation requests work?',
    answer:
      'You provide property details, highlight features, and submit contact info. A valuation is produced using market data and expert review.',
    tags: ['valuation', 'selling']
  },
  {
    id: 18,
    question: 'How quickly will I receive a home valuation?',
    answer:
      'Valuation requests are reviewed by a local expert, typically within one business day.',
    tags: ['valuation', 'selling']
  },
  {
    id: 19,
    question: 'What is an MLS number used for?',
    answer:
      'The MLS number uniquely identifies a listing and helps with verification, inquiries, and scheduling.',
    tags: ['mls', 'properties']
  },
  {
    id: 20,
    question: 'Do you help with negotiations and inspections for buyers?',
    answer:
      'Yes. The buyer process includes negotiation support, contract reviews, and coordinating inspections.',
    tags: ['buying', 'negotiation']
  }
]
