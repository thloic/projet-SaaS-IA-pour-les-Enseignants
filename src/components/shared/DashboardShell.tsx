'use client'

import { useState } from 'react'
import Navbar from '@/components/shared/Navbar'
import Sidebar from '@/components/shared/Sidebar'
import { useTheme } from '@/components/shared/ThemeProvider'
import type { TeacherIdentity } from '@/features/profile/types/profile.types'

interface DashboardShellProps {
  teacher: TeacherIdentity | null
  children: React.ReactNode
}

export default function DashboardShell({ teacher, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className={`min-h-screen w-full overflow-x-clip bg-background text-foreground ${isDark ? 'dark' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onToggle={() => setCollapsed((v) => !v)}
        teacher={teacher}
      />
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          collapsed ? 'lg:pl-16' : 'lg:pl-60'
        }`}
      >
        <Navbar
          onMenuToggle={() => setMobileOpen((v) => !v)}
          isDark={isDark}
          onThemeToggle={toggleTheme}
          teacher={teacher}
        />
        <main className="min-w-0 flex-1 px-3 py-5 pb-24 sm:px-4 sm:py-6 lg:px-8 lg:py-8 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
