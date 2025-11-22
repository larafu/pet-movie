"use client";
import { cn } from "@/shared/lib/utils";
import { useMotionValue, animate, motion, AnimationPlaybackControls } from "motion/react";
import { useState, useEffect, useRef } from "react";
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
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);
  const animationRef = useRef<AnimationPlaybackControls | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Initialize and manage the continuous animation
  useEffect(() => {
    const size = direction === "horizontal" ? width : height;

    // If size is not ready, don't start animation
    if (!size || size === 0) {
      return;
    }

    // Size is the total width/height of both copies of children
    // We need to scroll exactly half of that distance for seamless loop
    const singleContentSize = size / 2;
    const from = reverse ? -singleContentSize : 0;
    const to = reverse ? 0 : -singleContentSize;

    // Calculate duration based on speed
    const distance = Math.abs(to - from);
    const duration = distance / speed;

    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // Set initial position
    translation.set(from);

    // Create infinite looping animation
    // repeatType "loop" automatically resets to 'from' position
    const controls = animate(translation, to, {
      ease: "linear",
      duration: duration,
      repeat: Infinity,
      repeatType: "loop",
      repeatDelay: 0,
    });

    animationRef.current = controls;

    return () => {
      controls.stop();
    };
  }, [width, height, gap, speed, direction, reverse, translation]);

  // Handle hover pause/resume separately from main animation
  useEffect(() => {
    const animation = animationRef.current;
    if (!animation) return;

    if (isHovered && speedOnHover === 0) {
      // Pause the animation smoothly without recreating it
      animation.pause();
    } else if (!isHovered && animation.state === "paused") {
      // Resume the animation from where it paused
      animation.play();
    }
    // Note: We intentionally don't handle speedOnHover !== 0 case to avoid animation recreation
  }, [isHovered, speedOnHover]);

  const hoverProps = speedOnHover !== undefined
    ? {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      }
    : {};

  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex w-max will-change-transform"
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
