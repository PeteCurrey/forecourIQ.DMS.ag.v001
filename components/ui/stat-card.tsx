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
    <div className={cn("bg-carbon border border-steel rounded-[2px] p-6", className)}>
      <div className="space-y-1 mb-4">
        <span className="font-mono text-[10px] text-pewter uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      
      <div className="flex flex-col gap-1">
        <h3 className={cn(
          "font-syne font-bold text-cream leading-tight",
          typeof value === 'string' && value.length > 8 ? "text-[32px]" : "text-5xl"
        )}>
          {value}
        </h3>
        
        <div className="flex items-center justify-between mt-2">
          {sub && (
            <span className="font-inter text-sm text-silver">
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
