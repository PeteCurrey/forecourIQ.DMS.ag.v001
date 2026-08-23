import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors focus:outline-none focus:ring-1 focus:ring-blue",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue text-white font-medium",
        secondary: "border-steel bg-asphalt text-silver font-medium",
        outline: "border-steel bg-carbon text-silver",
        positive: "border-positive/30 bg-positive/10 text-positive font-medium",
        warning: "border-warning/30 bg-warning/10 text-warning font-medium",
        negative: "border-negative/30 bg-negative/10 text-negative font-medium",
        blue: "border-blue/30 bg-blue/10 text-blue font-medium",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
