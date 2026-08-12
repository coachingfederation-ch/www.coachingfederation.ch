/**
 * Animated proof-bar figure. Counts plain numbers up (400+, 8, 140+) with an ease-out ramp,
 * and reveals four-digit years with a per-digit settle instead of a count-up, because a year
 * counting from 0 reads as nonsense. Runs once, when the figure scrolls into view, and is
 * skipped entirely for users who prefer reduced motion.
 */
import { useEffect, useRef, useState } from "react";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Splits "400+" into prefix "", digits "400", suffix "+". */
function parseValue(value: string) {
  const match = value.match(/^(\D*)(\d[\d'’., ]*)(.*)$/);
  if (!match) return null;
  const digits = match[2].replace(/[^\d]/g, "");
  if (!digits) return null;
  return { prefix: match[1], digits, suffix: match[3], target: Number(digits) };
}

function CountUp({ target, duration }: { target: number; duration: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.round(easeOut(p) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{n}</>;
}

function YearReveal({ digits }: { digits: string }) {
  return (
    <>
      {digits.split("").map((d, i) => (
        <span
          key={`${i}-${d}`}
          className="inline-block animate-fade-in [animation-fill-mode:backwards]"
          style={{ animationDelay: `${i * 110}ms`, animationDuration: "500ms" }}
        >
          {d}
        </span>
      ))}
    </>
  );
}

export function AnimatedStat({ value, className }: { value: string; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLParagraphElement>();
  const parsed = parseValue(value);
  const isYear = parsed ? /^(19|20)\d{2}$/.test(parsed.digits) : false;
  const animate = inView && !reduced && parsed !== null;

  return (
    <p ref={ref} className={className}>
      <span className="tabular-nums">
        {!animate || !parsed ? (
          value
        ) : (
          <>
            {parsed.prefix}
            {isYear ? (
              <YearReveal digits={parsed.digits} />
            ) : (
              <CountUp target={parsed.target} duration={1400} />
            )}
            {parsed.suffix}
          </>
        )}
      </span>
    </p>
  );
}