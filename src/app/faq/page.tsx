import type { Metadata } from 'next'
import FaqPage from '@/features/faq/components/FaqPage'

export const metadata: Metadata = {
  title: 'FAQ | EducAssist',
  description: 'Answers to frequently asked questions about EducAssist.',
}

export default function Page() {
  return <FaqPage />
}
