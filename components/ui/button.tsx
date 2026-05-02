import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[2px] text-sm font-syne font-bold tracking-[0.08em] ring-offset-void transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 uppercase",
  {
    variants: {
      variant: {
        primary: "bg-blue text-void hover:bg-blue-dim",
        outline: "border-2 border-blue bg-transparent text-cream hover:bg-blue/5",
        secondary: "bg-steel text-cream hover:bg-slate",
        ghost: "bg-transparent text-silver hover:text-cream hover:bg-asphalt",
        danger: "border-2 border-negative bg-transparent text-negative hover:bg-negative/5",
        link: "text-blue underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-14 px-8 py-4",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
