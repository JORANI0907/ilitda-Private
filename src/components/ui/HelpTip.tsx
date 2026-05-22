import { ReactNode } from 'react'
import { Info, AlertTriangle } from 'lucide-react'

interface HelpTipProps {
  children: ReactNode
  variant?: 'info' | 'warning'
  className?: string
}

export function HelpTip({ children, variant = 'info', className = '' }: HelpTipProps) {
  const isWarning = variant === 'warning'
  return (
    <div className={`flex items-start gap-1.5 ${className}`}>
      {isWarning
        ? <AlertTriangle size={11} className="shrink-0 mt-0.5 text-state-warning" />
        : <Info         size={11} className="shrink-0 mt-0.5 text-text-tertiary" />
      }
      <p className={`text-[11px] leading-relaxed ${isWarning ? 'text-state-warning' : 'text-text-tertiary'}`}>
        {children}
      </p>
    </div>
  )
}
