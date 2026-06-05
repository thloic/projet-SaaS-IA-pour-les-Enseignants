import { redirect } from 'next/navigation'

// Cette route (/) redirige vers /dashboard
// Le contenu est dans app/(dashboard)/dashboard/page.tsx
export default function DashboardRootRedirect() {
  redirect('/dashboard')
}
