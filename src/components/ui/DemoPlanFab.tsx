'use client'

import Link from 'next/link'
import Image from 'next/image'

export function DemoPlanFab() {
  return (
    <Link
      href="/business/settings/plan"
      className="fixed bottom-[84px] right-4 z-50 flex flex-col items-center gap-1 bg-white border border-border shadow-pop rounded-2xl px-2.5 py-2 active:scale-95 transition-transform md:bottom-6"
      aria-label="플랜구독"
    >
      <div className="w-14 h-10 overflow-hidden">
        <Image
          src="/brand/logo-main.png"
          alt="일잇다"
          width={56}
          height={40}
          className="w-full h-full object-contain"
        />
      </div>
      <span className="text-[10px] font-bold text-brand-600 tracking-tight">플랜구독</span>
    </Link>
  )
}
