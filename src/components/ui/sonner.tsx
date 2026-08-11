"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

import { useTheme } from "next-themes"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-border bg-popover text-popover-foreground shadow-xl backdrop-blur-sm",
          description: "text-muted-foreground",
          actionButton:
            "bg-brand text-brand-foreground font-semibold hover:bg-brand-soft",
          cancelButton:
            "bg-muted text-muted-foreground hover:bg-muted-foreground/20",
          error:
            "border-destructive/25 bg-popover text-popover-foreground",
          success:
            "border-[rgba(34,197,94,0.25)] bg-popover text-popover-foreground",
          warning:
            "border-[rgba(245,158,11,0.25)] bg-popover text-popover-foreground",
          info:
            "border-brand/25 bg-popover text-popover-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
