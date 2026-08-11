import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[rgba(255,106,0,0.30)] bg-[rgba(255,106,0,0.12)] text-[#FF6A00]",
        secondary:
          "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.65)]",
        destructive:
          "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)] text-red-400",
        outline:
          "border-[rgba(255,255,255,0.12)] bg-transparent text-[rgba(255,255,255,0.55)]",
        success:
          "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.10)] text-emerald-400",
        warning:
          "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.10)] text-amber-400",
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
