import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, WandSparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import MarkdownContent from '@/features/generation/components/MarkdownContent'
import { getMyCourse } from '@/features/generation/server/courses'
import ExportButton from '@/features/export/components/ExportButton'

export const dynamic = 'force-dynamic'

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const course = await getMyCourse(id)

  if (!course) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/generate">
            <ArrowLeft size={15} /> Retour aux cours
          </Link>
        </Button>
        {course.status === 'complete' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-56">
              <ExportButton source="course" sourceId={course.id} />
            </div>
            <Button asChild size="sm">
              <Link href={`/adaptations/new?sourceType=course&sourceId=${course.id}`}>
                <WandSparkles size={15} /> Adapter en 5 versions
              </Link>
            </Button>
          </div>
        )}
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{course.subject}</Badge>
          <Badge variant="outline">{course.level}</Badge>
          <Badge variant="outline" className="gap-1">
            <Clock size={13} /> {course.duration_minutes} min
          </Badge>
        </div>
        <h1 className="text-2xl font-black sm:text-3xl">{course.title}</h1>
        <p className="text-sm text-muted-foreground">
          Généré le {new Date(course.created_at).toLocaleDateString('fr-FR')}
        </p>
      </header>

      {course.status !== 'complete' ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
          {course.status === 'generating'
            ? 'Ce cours est encore marqué comme en cours de génération.'
            : 'La génération de ce cours a échoué. Le contenu disponible peut être incomplet.'}
        </div>
      ) : null}

      <article className="rounded-2xl border border-border bg-card/40 p-4 sm:p-6">
        {course.content_md ? (
          <MarkdownContent content={course.content_md} />
        ) : (
          <p className="text-sm text-muted-foreground">Aucun contenu n’est disponible pour ce cours.</p>
        )}
      </article>
    </div>
  )
}
