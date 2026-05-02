import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[2px] border px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue text-void",
        secondary: "border-steel bg-asphalt text-silver",
        outline: "border-steel text-silver",
        positive: "border-positive/20 bg-positive/10 text-positive",
        warning: "border-warning/20 bg-warning/10 text-warning",
        negative: "border-negative/20 bg-negative/10 text-negative",
        blue: "border-blue/20 bg-blue/10 text-blue",
      },
    },
    defaultVariants: {
      variant: "default",
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
