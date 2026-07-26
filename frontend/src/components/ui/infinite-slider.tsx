import { Children, type ReactNode } from "react";

import { motion, useReducedMotion } from "framer-motion";
import useMeasure from "react-use-measure";

import { cn } from "@/lib/utils";

type InfiniteSliderProps = {
  children: ReactNode;
  className?: string;
  gap?: number;
  duration?: number;
  reverse?: boolean;
};

export default function InfiniteSlider({
  children,
  className,
  gap = 16,
  duration = 24,
  reverse = false,
}: InfiniteSliderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [measureRef, bounds] = useMeasure();
  const contentWidth = Math.round(bounds.width);
  const childList = Children.toArray(children);

  const sharedGroupStyle = {
    gap: `${gap}px`,
    paddingRight: `${gap}px`,
  } as const;

  if (prefersReducedMotion || contentWidth <= 0) {
    return (
      <div className={cn("w-full overflow-x-auto overflow-y-hidden", className)}>
        <div className="flex w-max items-center">
          <div
            ref={measureRef}
            className="flex shrink-0 items-center"
            style={sharedGroupStyle}
          >
            {childList}
          </div>
          <div className="flex shrink-0 items-center" style={sharedGroupStyle}>
            {childList}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <motion.div
        key={contentWidth}
        className="flex w-max items-center will-change-transform"
        initial={{ x: 0 }}
        animate={{ x: reverse ? contentWidth : -contentWidth }}
        transition={{
          duration,
          ease: "linear",
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
        }}
      >
        <div
          ref={measureRef}
          className="flex shrink-0 items-center"
          style={sharedGroupStyle}
        >
          {childList}
        </div>
        <div className="flex shrink-0 items-center" style={sharedGroupStyle}>
          {childList}
        </div>
      </motion.div>
    </div>
  );
}
