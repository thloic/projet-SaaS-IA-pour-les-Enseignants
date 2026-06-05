'use client'

import { useState } from 'react'
import {
  ClipboardList,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const BRAND = '#534AB7'

const mockCourses = [
  { id: '1', title: 'Théorème de Pythagore', subject: 'Maths', level: '3ème', date: 'il y a 2h' },
  { id: '2', title: 'La Révolution française', subject: 'Histoire', level: '4ème', date: 'hier' },
  { id: '3', title: 'Analyse de texte narratif', subject: 'Français', level: '5ème', date: 'il y a 2j' },
  { id: '4', title: 'Écosystèmes & biodiversité', subject: 'SVT', level: '6ème', date: 'il y a 3j' },
]

const mockQuestions = [
  { type: 'multiple_choice', question: 'Dans un triangle rectangle, quel est le côté le plus long ?', options: ['Un côté adjacent', "L'hypoténuse", 'Le côté opposé', 'La médiane'], points: 2 },
  { type: 'true_false', question: "Le théorème de Pythagore s'applique à tout type de triangle.", options: ['Vrai', 'Faux'], points: 1 },
  { type: 'multiple_choice', question: 'Si a = 3 et b = 4 dans un triangle rectangle, quelle est la valeur de c ?', options: ['5', '6', '7', '12'], points: 2 },
  { type: 'open', question: 'Expliquez en vos propres mots comment appliquer le théorème de Pythagore.', options: [], points: 3 },
  { type: 'multiple_choice', question: 'Lequel de ces triplets est un triplet pythagoricien ?', options: ['(2, 3, 4)', '(3, 4, 5)', '(4, 5, 7)', '(5, 6, 8)'], points: 2 },
]

type BadgeColor = { label: string; badgeClass: string }

const subjectColors: Record<string, BadgeColor> = {
  Maths:    { label: 'Maths',    badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  Histoire: { label: 'Histoire', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30'   },
  Français: { label: 'Français', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30'         },
  SVT:      { label: 'SVT',      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
}

export default function QuizIndexPage() {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)

  function handleGenerate() {
    if (!selectedCourse) return
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      setShowQuiz(true)
    }, 1800)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-teal-500/20">
          <ClipboardList size={22} className="text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black">Quiz & QCM</h1>
          <p className="text-sm text-muted-foreground">
            Sélectionnez un cours pour générer un quiz automatiquement
          </p>
        </div>
      </div>

      {!showQuiz ? (
        <>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Choisir un cours
            </p>
            <div className="space-y-2">
              {mockCourses.map((course) => {
                const selected = selectedCourse === course.id
                const colors = subjectColors[course.subject] ?? {
                  label: course.subject,
                  badgeClass: 'bg-muted text-muted-foreground border-border',
                }
                return (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course.id)}
                    className={`w-full flex items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all ${
                      selected
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <div className="shrink-0 text-muted-foreground">
                      {selected ? (
                        <CheckCircle2 size={20} style={{ color: BRAND }} />
                      ) : (
                        <Circle size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{course.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{course.date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-[10px] border ${colors.badgeClass}`}>
                        {colors.label}
                      </Badge>
                      <Badge className="text-[10px] border border-border text-muted-foreground bg-muted/40">
                        {course.level}
                      </Badge>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            className="w-full h-12 text-base text-white font-bold flex items-center gap-2"
            style={{ backgroundColor: BRAND }}
            disabled={!selectedCourse || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <>
                <Sparkles size={18} className="animate-spin" />
                Génération du quiz…
              </>
            ) : (
              <>
                <ClipboardList size={18} />
                Générer le quiz
              </>
            )}
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Quiz généré — {mockQuestions.length} questions
              </h2>
              <p className="text-sm text-muted-foreground">Théorème de Pythagore · 3ème</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowQuiz(false)
                setSelectedCourse(null)
              }}
            >
              Nouveau quiz
            </Button>
          </div>

          <div className="space-y-3">
            {mockQuestions.map((q, i) => (
              <div key={i} className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-6 shrink-0 pt-0.5">
                      {i + 1}.
                    </span>
                    <p className="text-sm font-medium">{q.question}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="text-[10px] border border-border text-muted-foreground bg-muted/40">
                      {q.type === 'multiple_choice'
                        ? 'QCM'
                        : q.type === 'true_false'
                        ? 'V/F'
                        : 'Ouverte'}
                    </Badge>
                    <Badge className="text-[10px] bg-violet-500/20 text-violet-300 border-violet-500/30">
                      {q.points} pt{q.points > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                {q.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 pl-8">
                    {q.options.map((opt, j) => (
                      <div
                        key={j}
                        className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground"
                      >
                        {String.fromCharCode(65 + j)}. {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button className="w-full text-white" style={{ backgroundColor: BRAND }}>
            <BookOpen size={16} className="mr-2" /> Exporter le quiz
          </Button>
        </div>
      )}
    </div>
  )
}
