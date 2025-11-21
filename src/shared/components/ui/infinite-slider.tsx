"use client";
import { cn } from "@/shared/lib/utils";
import { useMotionValue, animate, motion } from "motion/react";
import { useState, useEffect } from "react";
import useMeasure from "react-use-measure";

export type InfiniteSliderProps = {
  children: React.ReactNode;
  gap?: number;
  speed?: number;
  speedOnHover?: number;
  direction?: "horizontal" | "vertical";
  reverse?: boolean;
  className?: string;
};

export function InfiniteSlider({
  children,
  gap = 16,
  speed = 100,
  speedOnHover,
  direction = "horizontal",
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const [currentSpeed, setCurrentSpeed] = useState(speed);
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const size = direction === "horizontal" ? width : height;
    const contentSize = size + gap;
    const from = reverse ? -contentSize / 2 : 0;
    const to = reverse ? 0 : -contentSize / 2;

    // If paused, don't start animation
    if (isPaused) {
      return;
    }

    const currentPosition = translation.get();

    // Calculate remaining distance from current position
    let startPosition = currentPosition;

    // If we're at or past the end, reset to start
    if ((reverse && currentPosition >= to) || (!reverse && currentPosition <= to)) {
      startPosition = from;
    }

    const remainingDistance = Math.abs(to - startPosition);
    const duration = remainingDistance / currentSpeed;

    const controls = animate(translation, [startPosition, to], {
      ease: "linear",
      duration: duration,
      repeat: Infinity,
      repeatType: "loop",
      repeatDelay: 0,
      onRepeat: () => {
        translation.set(from);
      },
    });

    return () => controls?.stop();
  }, [
    translation,
    currentSpeed,
    width,
    height,
    gap,
    isPaused,
    direction,
    reverse,
  ]);

  const hoverProps = speedOnHover !== undefined
    ? {
        onHoverStart: () => {
          if (speedOnHover === 0) {
            setIsPaused(true);
          } else {
            setCurrentSpeed(speedOnHover);
          }
        },
        onHoverEnd: () => {
          setIsPaused(false);
          setCurrentSpeed(speed);
        },
      }
    : {};

  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex w-max"
        style={{
          ...(direction === "horizontal"
            ? { x: translation }
            : { y: translation }),
          gap: `${gap}px`,
          flexDirection: direction === "horizontal" ? "row" : "column",
        }}
        ref={ref}
        {...hoverProps}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}
