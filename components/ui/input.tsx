import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9.5 w-full rounded-[2px] border border-steel bg-carbon px-3 py-2 font-inter text-xs text-cream ring-offset-void file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-pewter focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue focus-visible:border-blue disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
