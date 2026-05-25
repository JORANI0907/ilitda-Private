'use client'

import Link from 'next/link'
import Image from 'next/image'

export function DemoPlanFab() {
  return (
    <Link
      href="/business/settings/plan"
      className="fixed bottom-[84px] right-4 z-50 flex flex-col items-center gap-1 active:scale-95 transition-transform md:bottom-6"
      aria-label="플랜구독"
    >
      <div className="w-16 h-12 drop-shadow-lg">
        <Image
          src="/brand/logo-nukki.png"
          alt="일잇다"
          width={64}
          height={48}
          className="w-full h-full object-contain"
        />
      </div>
      <span className="text-[10px] font-bold text-brand-600 tracking-tight bg-white/80 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm">
        플랜구독
      </span>
    </Link>
  )
}
