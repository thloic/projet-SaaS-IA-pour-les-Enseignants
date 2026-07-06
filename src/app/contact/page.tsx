import type { Metadata } from 'next'
import ContactPage from '@/features/contact/components/ContactPage'

export const metadata: Metadata = {
  title: 'Contact | EducAssist',
  description: 'Contact the EducAssist team.',
}

export default function Page() {
  return <ContactPage />
}
