"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type TabItemProps = {
  children: React.ReactNode;
  selected: boolean;
  redBean?: boolean;
  onClick?: () => void;
  className?: string;
};

export type TabProps = {
  children: React.ReactNode;
  onChange: (index: number) => void;
  size?: "large" | "small";
  fluid?: boolean;
  itemGap?: number;
  ariaLabel?: string;
  className?: string;
};

type IndicatorState = {
  left: number;
  width: number;
  visible: boolean;
};

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

function getSizeClass(size: NonNullable<TabProps["size"]>) {
  switch (size) {
    case "small":
      return "h-9 ob-typo-caption1";
    case "large":
    default:
      return "h-11 ob-typo-body2";
  }
}

const TabItem = React.forwardRef<HTMLButtonElement, TabItemProps>(function TabItem(
  { children, selected, redBean = false, onClick, className },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center px-4 transition-colors duration-150 hover:text-(--oboon-text-default)",
        getSizeClass("large"),
        selected
          ? "text-(--oboon-text-default) font-semibold"
          : "text-(--oboon-text-muted)",
        className,
      )}
    >
      <span className="relative inline-flex items-center justify-center">
        {children}
        {redBean ? (
          <span className="absolute right-[-0.25rem] top-2 h-1.5 w-1.5 rounded-full bg-(--oboon-danger)" />
        ) : null}
      </span>
    </button>
  );
});

function TabRoot({
  children,
  onChange,
  size = "large",
  fluid = false,
  itemGap,
  ariaLabel,
  className,
}: TabProps) {
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = React.useState<IndicatorState>({
    left: 0,
    width: 0,
    visible: false,
  });

  const items = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<TabItemProps>[];
  const selectedIndex = items.findIndex((item) => item.props.selected);

  useIsomorphicLayoutEffect(() => {
    const track = containerRef.current;
    const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const activeButton = tabRefs.current[activeIndex] ?? null;

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
      tabRefs.current.forEach((button) => {
        if (button) resizeObserver?.observe(button);
      });
    } else {
      window.addEventListener("resize", updateIndicator);
    }

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [selectedIndex, items.length]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const focusableTabs = tabRefs.current.filter(Boolean);
    if (focusableTabs.length === 0) return;

    const currentIndex = focusableTabs.findIndex(
      (tab) => tab === document.activeElement,
    );

    let nextIndex = currentIndex;
    switch (event.key) {
      case "ArrowLeft":
        nextIndex =
          currentIndex <= 0 ? focusableTabs.length - 1 : currentIndex - 1;
        break;
      case "ArrowRight":
        nextIndex =
          currentIndex === -1 || currentIndex >= focusableTabs.length - 1
            ? 0
            : currentIndex + 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    focusableTabs[nextIndex]?.focus();
    focusableTabs[nextIndex]?.click();
  };

  const gapStyle =
    typeof itemGap === "number" ? { gap: `${itemGap}px` } : undefined;

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative flex border-b border-(--oboon-border-default)",
        fluid ? "overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]" : "overflow-hidden",
        className,
      )}
      style={gapStyle}
      onKeyDown={handleKeyDown}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 h-0.5 bg-(--oboon-primary) transition-all duration-200"
        style={{
          width: indicator.width,
          transform: `translateX(${indicator.left}px)`,
          opacity: indicator.visible ? 1 : 0,
        }}
      />

      {items.map((item, index) => {
        const selected = Boolean(item.props.selected);
        return React.cloneElement(item, {
          ref: (node: HTMLButtonElement | null) => {
            tabRefs.current[index] = node;
          },
          onClick: () => onChange(index),
          className: cn(
            getSizeClass(size),
            selected ? "text-(--oboon-text-default) font-semibold" : "text-(--oboon-text-muted)",
            item.props.className,
          ),
        } as Partial<TabItemProps>);
      })}
    </div>
  );
}

type TabCompound = typeof TabRoot & {
  Item: typeof TabItem;
};

const Tab = TabRoot as TabCompound;
Tab.Item = TabItem;

export default Tab;
