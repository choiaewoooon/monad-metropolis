"use client";

import { useEffect, useRef, useState } from "react";

/** A number that runs up to its new value — used for balances, once, when they change. */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current, end = value, t0 = performance.now(), dur = 650;
    if (start === end) return;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      setShown(start + (end - start) * e);
      if (k < 1) raf = requestAnimationFrame(step); else from.current = end;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}

/** The crossing: money leaving the cool side and landing on the warm side. Shown while a transfer is in flight. */
export function Crossing({ from, to }: { from: string; to: string }) {
  return (
    <div className="crossing-anim" aria-label={`Sending from ${from} to ${to}`}>
      <span className="end send"><span className="dot" />{from}</span>
      <span className="line"><i /></span>
      <span className="end home"><span className="dot" />{to}</span>
    </div>
  );
}

export function Icon({ src, size = 34 }: { src?: string; size?: number }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} style={{ flex: "none", width: size, height: size }} />;
}
