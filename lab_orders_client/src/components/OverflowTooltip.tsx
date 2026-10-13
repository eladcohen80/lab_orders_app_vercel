import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './OverflowTooltip.css';

interface OverflowTooltipProps {
  className?: string;
  text: string;
}

interface TooltipPosition {
  left: number;
  top: number;
  above: boolean;
}

export default function OverflowTooltip({ className, text }: OverflowTooltipProps) {
  const cellRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  const updateOverflow = useCallback(() => {
    const cell = cellRef.current;
    setIsOverflowing(Boolean(cell && cell.scrollWidth > cell.clientWidth));
  }, []);

  const showTooltip = useCallback(() => {
    const cell = cellRef.current;
    if (!cell || cell.scrollWidth <= cell.clientWidth) {
      return;
    }

    const rect = cell.getBoundingClientRect();
    const tooltipWidth = Math.min(480, window.innerWidth - 24);
    setTooltipPosition({
      left: Math.max(12, Math.min(rect.left, window.innerWidth - tooltipWidth - 12)),
      top: rect.top > window.innerHeight * 0.6 ? rect.top - 8 : rect.bottom + 8,
      above: rect.top > window.innerHeight * 0.6,
    });
  }, []);

  useLayoutEffect(() => {
    updateOverflow();
    const cell = cellRef.current;
    if (!cell || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(cell);
    return () => observer.disconnect();
  }, [updateOverflow, text]);

  return (
    <>
      <span
        ref={cellRef}
        className={className}
        tabIndex={isOverflowing ? 0 : undefined}
        aria-describedby={tooltipPosition ? tooltipId : undefined}
        onPointerEnter={showTooltip}
        onPointerLeave={() => setTooltipPosition(null)}
        onFocus={showTooltip}
        onBlur={() => setTooltipPosition(null)}
      >
        {text}
      </span>
      {tooltipPosition && createPortal(
        <div
          className={`overflow-tooltip${tooltipPosition.above ? ' overflow-tooltip-above' : ''}`}
          id={tooltipId}
          role="tooltip"
          style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
        >
          {text}
        </div>,
        document.body,
      )}
    </>
  );
}
