import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  delta?: {
    value: string
    type: 'positive' | 'negative' | 'neutral'
  }
  className?: string
}

export function StatCard({ label, value, sub, delta, className }: StatCardProps) {
  return (
    <div className={cn("bg-carbon border border-steel rounded-[2px] p-5 shadow-2xs", className)}>
      <div className="space-y-1 mb-3">
        <span className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      
      <div className="flex flex-col gap-1">
        <h3 className={cn(
          "font-mono font-bold text-cream leading-tight tracking-tight",
          typeof value === 'string' && value.length > 8 ? "text-2xl" : "text-3xl"
        )}>
          {value}
        </h3>
        
        <div className="flex items-center justify-between mt-2">
          {sub && (
            <span className="font-inter text-xs text-silver">
              {sub}
            </span>
          )}
          
          {delta && (
            <span className={cn(
              "font-mono text-[11px] font-medium",
              delta.type === 'positive' && "text-positive",
              delta.type === 'negative' && "text-negative",
              delta.type === 'neutral' && "text-pewter"
            )}>
              {delta.value}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
