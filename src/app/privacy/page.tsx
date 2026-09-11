import type { Metadata } from 'next'
import PrivacyPolicyPage from '@/features/legal/components/PrivacyPolicyPage'

export const metadata: Metadata = {
  title: 'Privacy Policy | EducAssist',
  description: 'How EducAssist collects, uses, and protects personal information.',
}

export default function Page() {
  return <PrivacyPolicyPage />
}
