'use client'

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  DashboardClassEngagement,
  DashboardDistributionItem,
  DashboardTrendPoint,
} from '@/features/dashboard/types/dashboard.types'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'

const COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#38bdf8', '#8b5cf6', '#64748b']
const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--foreground)',
  fontSize: 12,
}

function dateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  })
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-64 items-center justify-center px-5 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

export function AttendanceTrendChart({ data }: { data: DashboardTrendPoint[] }) {
  const { locale } = useAppLocale()
  if (!data.some((item) => item.attendanceRate !== null)) {
    return (
      <EmptyChart>
        {locale === 'fr'
          ? 'Les présences apparaîtront après le premier appel.'
          : 'Attendance will appear after the first roll call.'}
      </EmptyChart>
    )
  }
  return (
    <div className="h-64 w-full" aria-label="Évolution du taux de présence">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
          <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(value) => dateLabel(String(value))}
            formatter={(value) => [`${value}%`, locale === 'fr' ? 'Présence' : 'Attendance']}
          />
          <Area
            type="monotone"
            dataKey="attendanceRate"
            fill="#10b981"
            fillOpacity={0.12}
            stroke="none"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="attendanceRate"
            stroke="#10b981"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ActivityTrendChart({ data }: { data: DashboardTrendPoint[] }) {
  const { locale } = useAppLocale()
  const hasData = data.some(
    (item) =>
      item.courses + item.quizzes + item.adaptations + item.bulletins + item.corrections > 0
  )
  if (!hasData) {
    return (
      <EmptyChart>
        {locale === 'fr'
          ? 'L’activité apparaîtra après la création de vos premiers contenus.'
          : 'Activity will appear after you create your first content.'}
      </EmptyChart>
    )
  }
  return (
    <div className="w-full overflow-x-auto" aria-label="Activité pédagogique">
      <div className="h-72 min-w-[560px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.18} />
            <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => dateLabel(String(value))} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="courses" name={locale === 'fr' ? 'Cours' : 'Lessons'} stackId="activity" fill="#8b5cf6" />
            <Bar dataKey="quizzes" name="Quiz" stackId="activity" fill="#38bdf8" />
            <Bar dataKey="adaptations" name="Adaptations" stackId="activity" fill="#10b981" />
            <Bar dataKey="bulletins" name={locale === 'fr' ? 'Bulletins' : 'Reports'} stackId="activity" fill="#f59e0b" />
            <Bar
              dataKey="corrections"
              name={locale === 'fr' ? 'Corrections' : 'Grading'}
              stackId="activity"
              fill="#f43f5e"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function DashboardDonutChart({
  data,
  emptyMessage,
}: {
  data: DashboardDistributionItem[]
  emptyMessage: string
}) {
  const { locale } = useAppLocale()
  const visible = data
    .filter((item) => item.value > 0)
    .map((item) => ({
      ...item,
      displayLabel: locale === 'fr' ? item.label : item.labelEn ?? item.label,
    }))
  if (visible.length === 0) return <EmptyChart>{emptyMessage}</EmptyChart>
  return (
    <div className="h-64 w-full" aria-label="Répartition">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={visible}
            dataKey="value"
            nameKey="displayLabel"
            innerRadius="50%"
            outerRadius="76%"
            paddingAngle={2}
          >
            {visible.map((item, index) => (
              <Cell key={item.key} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ClassEngagementChart({ data }: { data: DashboardClassEngagement[] }) {
  const { locale } = useAppLocale()
  const visible = data.filter(
    (item) => item.participations > 0 || item.observations > 0 || item.attendanceRate !== null
  )
  if (visible.length === 0) {
    return (
      <EmptyChart>
        {locale === 'fr'
          ? 'L’engagement apparaîtra après les premières séances.'
          : 'Engagement will appear after the first sessions.'}
      </EmptyChart>
    )
  }
  return (
    <div className="max-h-[30rem] w-full overflow-y-auto" aria-label="Engagement par classe">
      <div style={{ height: Math.max(270, visible.length * 48) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visible} layout="vertical" margin={{ left: 10, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.18} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="participations" name={locale === 'fr' ? 'Participations' : 'Participation'} fill="#38bdf8" radius={[0, 3, 3, 0]} />
            <Bar dataKey="observations" name="Observations" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
