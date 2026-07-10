import LoadingSpinner from '@/components/shared/LoadingSpinner'

export default function QuizLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  )
}
