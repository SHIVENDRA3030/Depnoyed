import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F5F5F0] placeholder:text-[rgba(255,255,255,0.30)] transition-all duration-150",
          "focus-visible:outline-none focus-visible:border-[#FF6A00] focus-visible:ring-2 focus-visible:ring-[rgba(255,106,0,0.18)] focus-visible:bg-[rgba(255,255,255,0.05)]",
          "hover:border-[rgba(255,255,255,0.15)]",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#F5F5F0]",
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
