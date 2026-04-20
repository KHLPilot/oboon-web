"use client";

import * as React from "react";

export type SegmentedControlOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

export type SegmentedControlProps = {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  className?: string;
};

type IndicatorState = {
  left: number;
  width: number;
  visible: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export default function SegmentedControl({
  options,
  value,
  onChange,
  fullWidth = false,
  className,
}: SegmentedControlProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = React.useState<IndicatorState>({
    left: 0,
    width: 0,
    visible: false,
  });

  useIsomorphicLayoutEffect(() => {
    const track = trackRef.current;
    const activeIndex = options.findIndex((option) => option.value === value);
    const activeButton =
      activeIndex >= 0 ? itemRefs.current[activeIndex] ?? null : null;

    if (!track || !activeButton) {
      setIndicator({ left: 0, width: 0, visible: false });
      return;
    }

    const updateIndicator = () => {
      setIndicator({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        visible: true,
      });
    };

    updateIndicator();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateIndicator();
      });

      resizeObserver.observe(track);
      itemRefs.current.forEach((button) => {
        if (button) resizeObserver?.observe(button);
      });
    } else {
      window.addEventListener("resize", updateIndicator);
    }

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [options, value]);

  return (
    <div className={cn(
      "rounded-full bg-(--oboon-bg-subtle) p-1.5",
      fullWidth ? "flex w-full" : "inline-flex w-fit max-w-full overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]",
      className,
    )}>
      <div
        ref={trackRef}
        className={cn(
          "relative flex-nowrap items-stretch gap-1 whitespace-nowrap",
          fullWidth ? "flex w-full" : "inline-flex w-max",
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-(--oboon-primary) shadow-sm transition-transform duration-200 ease-out"
          style={{
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
            opacity: indicator.visible ? 1 : 0,
          }}
        />

        {options.map((option, index) => {
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              onClick={() => onChange(option.value)}
              aria-label={option.label}
              aria-pressed={isActive}
              className={cn(
                "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 ob-typo-button transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30",
                fullWidth ? "flex-1" : "shrink-0",
                isActive
                  ? "text-(--oboon-on-primary) font-medium"
                  : "text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
              )}
            >
              {option.icon ? (
                <span className="inline-flex shrink-0 items-center justify-center">
                  {option.icon}
                </span>
              ) : null}
              <span className={option.icon ? "hidden sm:inline" : "inline"}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
