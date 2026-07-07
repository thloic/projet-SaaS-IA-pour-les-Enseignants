'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

const LOGO_SRC = '/images/logo-pro-cropped.jpeg'
const LOGO_MARK_SRC = '/images/logo-mark.jpeg'

interface BrandLogoProps {
  variant?: 'full' | 'mark'
  className?: string
  priority?: boolean
}

export default function BrandLogo({ variant = 'full', className, priority = false }: BrandLogoProps) {
  if (variant === 'mark') {
    return (
      <span
        className={cn(
          'relative block h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#080d0f]',
          className
        )}
        aria-label="EducAssist"
      >
        <Image
          src={LOGO_MARK_SRC}
          alt="EducAssist"
          fill
          sizes="36px"
          className="object-cover"
          priority={priority}
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'relative block h-11 w-36 shrink-0 overflow-hidden rounded-lg bg-[#080d0f]',
        className
      )}
      aria-label="EducAssist"
    >
      <Image
        src={LOGO_SRC}
        alt="EducAssist"
        fill
        sizes="144px"
        className="object-contain"
        priority={priority}
      />
    </span>
  )
}
