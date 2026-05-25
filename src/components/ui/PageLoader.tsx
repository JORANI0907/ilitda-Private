import Image from 'next/image'

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface">
      <div className="relative w-36 h-28">
        <Image
          src="/brand/logo-nukki.png"
          alt="일잇다"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="flex gap-2 mt-6">
        <span
          className="w-2 h-2 rounded-full bg-brand-600 animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-brand-600 animate-bounce"
          style={{ animationDelay: '160ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-brand-600 animate-bounce"
          style={{ animationDelay: '320ms' }}
        />
      </div>
    </div>
  )
}
