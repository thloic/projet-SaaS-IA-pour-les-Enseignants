import type { Metadata } from 'next'
import TermsOfUsePage from '@/features/legal/components/TermsOfUsePage'

export const metadata: Metadata = {
  title: 'Terms of Use | EducAssist',
  description: 'The terms that govern your use of EducAssist.',
}

export default function Page() {
  return <TermsOfUsePage />
}
