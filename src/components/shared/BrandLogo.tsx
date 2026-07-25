'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

const LOGO_SRC = '/logosansbg.png'

interface BrandLogoProps {
  variant?: 'full' | 'mark'
  className?: string
  priority?: boolean
}

export default function BrandLogo({ variant = 'full', className, priority = false }: BrandLogoProps) {
  return (
    <span
      className={cn(
        variant === 'mark' ? 'h-9 w-9' : 'h-11 w-11',
        'relative block shrink-0 bg-transparent',
        className
      )}
      aria-label="EducAssist"
    >
      <Image
        src={LOGO_SRC}
        alt="EducAssist"
        fill
        sizes={variant === 'mark' ? '36px' : '144px'}
        className="object-contain [filter:drop-shadow(0_0_1px_rgba(3,7,18,0.95))_drop-shadow(0_1px_1px_rgba(3,7,18,0.65))] dark:[filter:none]"
        priority={priority}
      />
    </span>
  )
}
