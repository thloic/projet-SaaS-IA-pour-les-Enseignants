import type { Metadata } from 'next'
import AboutPage from '@/features/about/components/AboutPage'

export const metadata: Metadata = {
  title: 'About | EducAssist',
  description: 'Discover the mission and principles behind EducAssist.',
}

export default function Page() {
  return <AboutPage />
}
