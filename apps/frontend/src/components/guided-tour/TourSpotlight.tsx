'use client';

import { useEffect, useState } from 'react';

export function TourSpotlight({ targetEl }: { targetEl: HTMLElement }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => setRect(targetEl.getBoundingClientRect());
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const ro = new ResizeObserver(update);
    ro.observe(targetEl);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, [targetEl]);

  if (!rect) return null;
  const pad = 8;

  return (
    <div
      className="fixed z-[9998] pointer-events-none rounded-xl transition-all duration-300"
      style={{
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
        outline: '3px solid #10b981',
        outlineOffset: '2px',
      }}
    />
  );
}
