"use client"

import React from "react"
import { motion, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

const animationProps: MotionProps = {
  initial: { "--x": "100%" },
  animate: { "--x": "-100%" },
  whileTap: { scale: 0.98 },
  transition: {
    repeat: Infinity,
    repeatType: "loop",
    repeatDelay: 1,
    type: "spring",
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

interface ShinyButtonProps
  extends
    Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps>,
    MotionProps {
  children: React.ReactNode
  className?: string
  labelClassName?: string
}

export const ShinyButton = React.forwardRef<
  HTMLButtonElement,
  ShinyButtonProps
>(({ children, className, labelClassName, ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center rounded-lg border px-6 py-2 font-medium backdrop-blur-xl transition-[box-shadow,background-color,transform] duration-300 ease-in-out dark:bg-[radial-gradient(circle_at_50%_0%,var(--primary)/10%_0%,transparent_60%)]",
        className
      )}
      {...animationProps}
      {...props}
    >
      <span
        className={cn(
          "relative z-20 inline-flex items-center justify-center leading-none text-sm tracking-wide text-[rgb(0,0,0,65%)] uppercase dark:font-light dark:text-[rgb(255,255,255,90%)]",
          labelClassName
        )}
        style={{
          maskImage:
            "linear-gradient(-75deg,var(--primary) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),var(--primary) calc(var(--x) + 100%))",
        }}
      >
        {children}
      </span>
      <span
        aria-hidden
        style={{
          mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          WebkitMask:
            "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          backgroundImage:
            "linear-gradient(-75deg,var(--primary)/10% calc(var(--x)+20%),var(--primary)/50% calc(var(--x)+25%),var(--primary)/10% calc(var(--x)+100%))",
        }}
        className="pointer-events-none absolute inset-0 z-10 block rounded-[inherit] p-px"
      />
    </motion.button>
  )
})

ShinyButton.displayName = "ShinyButton"
