import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

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
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y, filter: `blur(${blur})` }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={viewport ?? { once: true, amount: 0.2 }}
      transition={{
        duration,
        ease: "easeOut",
        ...(transition ?? {}),
        delay,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default BlurFade;
