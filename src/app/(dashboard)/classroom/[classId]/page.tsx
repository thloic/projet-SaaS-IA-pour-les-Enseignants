import ClassDetail from '@/features/classroom/components/ClassDetail'

interface ClassDetailPageProps {
  params: Promise<{ classId: string }>
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { classId } = await params

  return <ClassDetail classId={classId} />
}
