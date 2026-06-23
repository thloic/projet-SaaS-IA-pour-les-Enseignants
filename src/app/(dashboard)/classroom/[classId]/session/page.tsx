import ClassSessionPage from '@/features/classroom/components/ClassSessionPage'

interface SessionPageProps {
  params: Promise<{ classId: string }>
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { classId } = await params

  return <ClassSessionPage classId={classId} />
}
