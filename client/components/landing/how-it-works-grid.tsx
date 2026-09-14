"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  CheckCircle2Icon,
  CreditCardIcon,
  MapPinIcon,
  PrinterIcon,
  QrCodeIcon,
  UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GradientStepIcon, type GradientToken } from "@/components/landing/how-it-works-icons";

const steps = [
  {
    step: 1,
    title: "Find a kiosk",
    description: "Locate a QuickPrint self-service kiosk at your campus or venue.",
    icon: MapPinIcon,
    containerClass: "from-chart-2/20 to-chart-3/10",
    gradientFrom: "chart-2" as GradientToken,
    gradientTo: "chart-3" as GradientToken,
  },
  {
    step: 2,
    title: "Scan the QR code",
    description: "Use your phone camera to open the kiosk page - no app download required.",
    icon: QrCodeIcon,
    containerClass: "from-chart-1/20 to-chart-2/10",
    gradientFrom: "chart-1" as GradientToken,
    gradientTo: "chart-2" as GradientToken,
  },
  {
    step: 3,
    title: "Upload your files",
    description: "Add PDFs or images from your device and review what you are printing.",
    icon: UploadIcon,
    containerClass: "from-chart-3/20 to-primary/10",
    gradientFrom: "chart-3" as GradientToken,
    gradientTo: "primary" as GradientToken,
  },
  {
    step: 4,
    title: "Choose print settings",
    description: "Set copies, color, page range, duplex, and paper size to match your needs.",
    icon: PrinterIcon,
    containerClass: "from-chart-4/20 to-chart-5/10",
    gradientFrom: "chart-4" as GradientToken,
    gradientTo: "chart-5" as GradientToken,
  },
  {
    step: 5,
    title: "Pay online",
    description: "Complete payment securely so your job can be processed at the kiosk.",
    icon: CreditCardIcon,
    containerClass: "from-primary/20 to-chart-1/10",
    gradientFrom: "primary" as GradientToken,
    gradientTo: "chart-1" as GradientToken,
  },
  {
    step: 6,
    title: "Collect your print",
    description: "Watch your job status and pick up your documents when printing is complete.",
    icon: CheckCircle2Icon,
    containerClass: "from-chart-2/20 to-chart-4/10",
    gradientFrom: "chart-2" as GradientToken,
    gradientTo: "chart-4" as GradientToken,
  },
];

type Point = { x: number; y: number };

const ANIMATION_DURATION_MS = 14_000;
const SPARK_LENGTH = 32;

function getPingPongProgress(elapsed: number) {
  const cycleProgress = (elapsed % ANIMATION_DURATION_MS) / ANIMATION_DURATION_MS;
  return cycleProgress < 0.5 ? cycleProgress * 2 : 2 - cycleProgress * 2;
}

function getRelativeRect(element: HTMLElement, container: HTMLElement) {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return {
    left: elementRect.left - containerRect.left,
    top: elementRect.top - containerRect.top,
    right: elementRect.right - containerRect.left,
    bottom: elementRect.bottom - containerRect.top,
    width: elementRect.width,
    height: elementRect.height,
  };
}

function buildSnakePath(centers: Point[]) {
  if (centers.length < 2) return "";

  let path = `M ${centers[0].x} ${centers[0].y}`;

  for (let index = 1; index < centers.length; index++) {
    const point = centers[index];

    if (index === 3) {
      const from = centers[2];
      const controlX = (from.x + point.x) / 2;
      const controlY = from.y + (point.y - from.y) * 0.55;
      path += ` Q ${controlX} ${controlY}, ${point.x} ${point.y}`;
      continue;
    }

    path += ` L ${point.x} ${point.y}`;
  }

  return path;
}

function getActiveCardIndex(point: Point, rects: ReturnType<typeof getRelativeRect>[]) {
  const { x, y } = point;
  let activeIndex: number | null = null;
  let closestDistance = Infinity;

  for (let index = 0; index < rects.length; index++) {
    const rect = rects[index];
    const inset = 12;

    if (
      x < rect.left + inset ||
      x > rect.right - inset ||
      y < rect.top + inset ||
      y > rect.bottom - inset
    ) {
      continue;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(x - centerX, y - centerY);

    if (distance < closestDistance) {
      closestDistance = distance;
      activeIndex = index;
    }
  }

  return activeIndex;
}

export function HowItWorksGrid() {
  const filterId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const sparkGlowPathRef = useRef<SVGPathElement>(null);
  const sparkPathRef = useRef<SVGPathElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const cardRectsRef = useRef<ReturnType<typeof getRelativeRect>[]>([]);
  const pathLengthRef = useRef(0);
  const activeCardRef = useRef<number | null>(null);

  const [pathD, setPathD] = useState("");
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const measureLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    const rects = cardRefs.current
      .slice(0, steps.length)
      .map((card) => (card ? getRelativeRect(card, container) : null))
      .filter((rect): rect is ReturnType<typeof getRelativeRect> => rect !== null);

    if (rects.length !== steps.length) return;

    cardRectsRef.current = rects;

    const centers = rects.map((rect) => ({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }));

    setSvgSize({ width: containerRect.width, height: containerRect.height });
    setPathD(buildSnakePath(centers));
  }, [steps.length]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    measureLayout();

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => measureLayout());
    resizeObserver.observe(container);
    cardRefs.current.forEach((card) => {
      if (card) resizeObserver.observe(card);
    });

    window.addEventListener("resize", measureLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureLayout);
    };
  }, [measureLayout]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "120px" }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pathElement = pathRef.current;
    if (!pathElement || !pathD) {
      pathLengthRef.current = 0;
      return;
    }

    pathLengthRef.current = pathElement.getTotalLength();
  }, [pathD]);

  useEffect(() => {
    if (reduceMotion || !pathD || !isVisible) {
      sparkGlowPathRef.current?.style.removeProperty("stroke-dashoffset");
      sparkPathRef.current?.style.removeProperty("stroke-dashoffset");
      activeCardRef.current = null;
      setActiveCardIndex(null);
      return;
    }

    const pathElement = pathRef.current;
    const sparkPathElement = sparkPathRef.current;
    const sparkGlowPathElement = sparkGlowPathRef.current;
    if (!pathElement || !sparkPathElement || !sparkGlowPathElement) return;

    let frameId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const pathLength = pathLengthRef.current;
      if (pathLength === 0) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - startTime;
      const pathProgress = getPingPongProgress(elapsed);
      const offset = pathLength - pathProgress * (pathLength + SPARK_LENGTH);

      const dashStyle = `${SPARK_LENGTH} ${pathLength}`;
      const offsetStyle = String(offset);

      sparkPathElement.style.strokeDasharray = dashStyle;
      sparkPathElement.style.strokeDashoffset = offsetStyle;
      sparkGlowPathElement.style.strokeDasharray = dashStyle;
      sparkGlowPathElement.style.strokeDashoffset = offsetStyle;

      const point = pathElement.getPointAtLength(pathProgress * pathLength);
      const nextActiveCard = getActiveCardIndex(point, cardRectsRef.current);
      if (nextActiveCard !== activeCardRef.current) {
        activeCardRef.current = nextActiveCard;
        setActiveCardIndex(nextActiveCard);
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [isVisible, pathD, reduceMotion]);

  return (
    <div ref={containerRef} className="relative mt-12">
      {pathD && svgSize.width > 0 && (
        <svg
          className="pointer-events-none absolute inset-0 z-0"
          width={svgSize.width}
          height={svgSize.height}
          viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
          aria-hidden="true"
        >
          <defs>
            <filter id={`how-it-works-spark-${filterId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke="color-mix(in oklch, var(--muted-foreground) 35%, transparent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="4 8"
          />

          {!reduceMotion && (
            <>
              <path
                ref={sparkGlowPathRef}
                d={pathD}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.22"
              />
              <path
                ref={sparkPathRef}
                d={pathD}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                filter={`url(#how-it-works-spark-${filterId})`}
              />
            </>
          )}
        </svg>
      )}

      <ol className="relative z-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((item, index) => (
          <li
            key={item.step}
            ref={(element) => {
              cardRefs.current[index] = element;
            }}
            className={cn(
              "relative rounded-2xl border bg-card/55 p-6 shadow-sm backdrop-blur-md transition-[box-shadow,border-color,background-color] duration-500",
              activeCardIndex === index &&
                "border-primary/25 bg-primary/5 shadow-[0_0_24px_-4px] shadow-primary/20"
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl bg-linear-to-br",
                  item.containerClass
                )}
              >
                <GradientStepIcon
                  icon={item.icon}
                  from={item.gradientFrom}
                  to={item.gradientTo}
                  className="size-5"
                />
              </div>
              <span className="font-heading text-muted-foreground text-sm tabular-nums">
                Step {item.step}
              </span>
            </div>
            <h3 className="font-heading text-lg font-medium">{item.title}</h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{item.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
