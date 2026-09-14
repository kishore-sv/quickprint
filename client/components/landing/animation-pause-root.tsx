"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type AnimationPauseRootProps = React.ComponentProps<"div">;

/** Pauses descendant CSS animations when the root is off-screen. */
export function AnimationPauseRoot({ className, children, ...props }: AnimationPauseRootProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setPaused(!entry.isIntersecting),
      { rootMargin: "80px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(paused && "[&_*]:[animation-play-state:paused]", className)}
      {...props}
    >
      {children}
    </div>
  );
}
