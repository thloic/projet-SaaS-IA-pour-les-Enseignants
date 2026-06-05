'use client'

import { useState } from 'react'
import Navbar from '../../components/shared/Navbar'
import Sidebar from '../../components/shared/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(true)

  return (
    <div className={`min-h-screen bg-background text-foreground ${isDark ? 'dark' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          collapsed ? 'lg:pl-16' : 'lg:pl-60'
        }`}
      >
        <Navbar
          onMenuToggle={() => setCollapsed((v) => !v)}
          isDark={isDark}
          onThemeToggle={() => setIsDark((v) => !v)}
        />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 pb-24 lg:pb-8">{children}</main>
      </div>
    </div>
  )
}

