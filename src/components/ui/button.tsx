import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all ios-ease active:scale-95 hover:shadow-lg disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20",
  {
    variants: {
      variant: {
        default: "bg-[#292524] text-[#F5F5F4] hover:bg-[#292524]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-[#E7E5E4] bg-white text-[#78716C] hover:border-[#D6D3D1] hover:text-[#292524] hover:shadow-md",
        secondary:
          "bg-[#F5F5F4] text-[#292524] hover:bg-[#E7E5E4]",
        ghost:
          "hover:bg-[#F5F5F4] hover:text-[#292524] shadow-none hover:shadow-none",
        link: "text-[#292524] underline-offset-4 hover:underline shadow-none hover:shadow-none active:scale-100",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-full",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-9 w-9 px-0 shadow-none hover:shadow-none rounded-full",
        "icon-sm": "h-8 w-8 px-0 shadow-none hover:shadow-none rounded-full",
        pill: "px-8 py-3 h-auto rounded-xl", // Added pill size for the specific big button style
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
