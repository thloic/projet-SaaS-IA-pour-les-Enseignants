'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  AttendanceTrendPoint,
  ClassOverviewItem,
  ClassroomDistributionItem,
  ClassSessionSummary,
  StudentDashboardRow,
} from '@/features/classroom/types/classroomDashboard.types'

const CHART_COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#38bdf8', '#8b5cf6', '#64748b']

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--foreground)',
  fontSize: 12,
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export function GlobalAttendanceChart({ classes }: { classes: ClassOverviewItem[] }) {
  const data = classes
    .filter((item) => item.attendanceRate !== null)
    .map((item) => ({ name: item.name, presence: item.attendanceRate }))

  if (data.length === 0) {
    return <EmptyChart message="Les taux apparaîtront après les premières séances." />
  }

  return (
    <div className="max-h-[30rem] w-full overflow-y-auto" aria-label="Taux de présence par classe">
      <div style={{ height: Math.max(288, data.length * 44) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [`${value}%`, 'Présence']}
            />
            <Bar dataKey="presence" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function AttendanceLineChart({ points }: { points: AttendanceTrendPoint[] }) {
  const data = points.slice(-14).map((point) => ({
    ...point,
    label: new Date(`${point.date}T12:00:00`).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    }),
  }))
  if (data.length === 0) {
    return <EmptyChart message="Démarrez une séance pour voir la tendance." />
  }

  return (
    <div className="h-64 w-full" aria-label="Évolution du taux de présence">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [value === null ? 'Non saisi' : `${value}%`, 'Présence']}
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 3, fill: '#10b981' }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DistributionDonutChart({
  data,
  emptyMessage,
}: {
  data: ClassroomDistributionItem[]
  emptyMessage: string
}) {
  const visibleData = data.filter((item) => item.value > 0)
  if (visibleData.length === 0) return <EmptyChart message={emptyMessage} />

  return (
    <div className="h-64 w-full" aria-label="Répartition des données">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={visibleData}
            dataKey="value"
            nameKey="label"
            innerRadius="52%"
            outerRadius="78%"
            paddingAngle={2}
          >
            {visibleData.map((item, index) => (
              <Cell key={item.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ParticipationBarChart({ students }: { students: StudentDashboardRow[] }) {
  const data = [...students]
    .sort((a, b) => b.participationEvents - a.participationEvents)
    .slice(0, 12)
    .map((student) => ({
      name: `${student.firstName} ${student.lastName.charAt(0)}.`,
      événements: student.participationEvents,
      score: student.participationScore,
    }))
  if (data.length === 0 || data.every((item) => item.événements === 0)) {
    return <EmptyChart message="Les participations apparaîtront après leur saisie en séance." />
  }

  return (
    <div className="w-full overflow-x-auto" aria-label="Participation par élève">
      <div className="h-72 min-w-[560px]">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -24, bottom: 35 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
          <XAxis
            dataKey="name"
            angle={-35}
            textAnchor="end"
            interval={0}
            tick={{ fontSize: 10 }}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="événements" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function SessionActivityChart({ sessions }: { sessions: ClassSessionSummary[] }) {
  const data = [...sessions]
    .reverse()
    .slice(-12)
    .map((session) => ({
      date: new Date(`${session.date}T12:00:00`).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
      }),
      participations: session.participationEvents,
      observations: session.observationCount,
    }))
  if (
    data.length === 0 ||
    data.every((item) => item.participations === 0 && item.observations === 0)
  ) {
    return <EmptyChart message="L’activité apparaîtra après les premières saisies." />
  }

  return (
    <div className="w-full overflow-x-auto" aria-label="Activité par séance">
      <div className="h-64 min-w-[520px]">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="participations" fill="#38bdf8" radius={[3, 3, 0, 0]} />
          <Bar dataKey="observations" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
        </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
