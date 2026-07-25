import HistoryPageContent from '@/features/dashboard/history/HistoryPageContent'
import { loadCentralDashboard } from '@/features/dashboard/server/dashboardData'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string | string[]
    from?: string | string[]
    to?: string | string[]
  }>
}) {
  const params = await searchParams
  const data = await loadCentralDashboard(params)

  return <HistoryPageContent data={data} />
}
