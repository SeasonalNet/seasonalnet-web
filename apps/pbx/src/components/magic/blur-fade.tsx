"use client"

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@seasonalnet/shell/src/lib/utils";

export type BlurFadeProps = HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
  duration?: number;
  blur?: string;
};

export function BlurFade({
  children,
  className,
  delay = 0,
  y = 12,
  duration = 0.4,
  blur = "6px",
  transition,
  viewport,
  ...props
}: BlurFadeProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y, filter: `blur(${blur})` }}
      whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={viewport ?? { once: true, amount: 0.2 }}
      transition={{
        duration: reduceMotion ? 0.15 : duration,
        ease: "easeOut",
        ...(transition ?? {}),
        delay: reduceMotion ? 0 : delay,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
