import CentralDashboard from '@/features/dashboard/components/CentralDashboard'
import { loadCentralDashboard } from '@/features/dashboard/server/dashboardData'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    welcome?: string
    deleted?: string
    preset?: string | string[]
    from?: string | string[]
    to?: string | string[]
  }>
}) {
  const params = await searchParams
  const data = await loadCentralDashboard(params)

  return (
    <CentralDashboard
      data={data}
      showWelcome={params.welcome === '1'}
      showDeletedFeedback={params.deleted === '1'}
    />
  )
}
