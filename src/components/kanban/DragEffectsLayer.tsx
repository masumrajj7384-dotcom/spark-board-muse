import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Particle = { id: number; x: number; y: number };

/**
 * Renders a subtle cursor-follow glow trail while `active` is true,
 * plus an imperative celebration burst API via ref.
 */
export type EffectsHandle = {
  celebrate: (x: number, y: number) => void;
};

export default function DragEffectsLayer({
  active,
  handleRef,
}: {
  active: boolean;
  handleRef: React.MutableRefObject<EffectsHandle | null>;
}) {
  const [trail, setTrail] = useState<Particle[]>([]);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const idc = useRef(0);

  useEffect(() => {
    handleRef.current = {
      celebrate: (x, y) => {
        const id = ++idc.current;
        setBursts((b) => [...b, { id, x, y }]);
        setTimeout(() => setBursts((b) => b.filter((p) => p.id !== id)), 1400);
      },
    };
  }, [handleRef]);

  useEffect(() => {
    if (!active) { setTrail([]); return; }
    let raf = 0;
    let lastAdd = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastAdd < 28) return;
      lastAdd = now;
      const id = ++idc.current;
      setTrail((prev) => [...prev.slice(-14), { id, x: e.clientX, y: e.clientY }]);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setTrail((prev) => prev.filter((p) => p.id > id - 15));
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, [active]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <AnimatePresence>
        {trail.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0.55, scale: 1 }}
            animate={{ opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: p.x,
              top: p.y,
              background: "radial-gradient(circle, oklch(0.78 0.22 295 / 0.55), transparent 70%)",
              filter: "blur(4px)",
            }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0.9, scale: 0.2 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: b.x,
              top: b.y,
              width: 360,
              height: 360,
              background: "radial-gradient(circle, oklch(0.78 0.2 155 / 0.35), oklch(0.7 0.22 200 / 0.15) 40%, transparent 70%)",
              filter: "blur(2px)",
            }}
          >
            {/* geometric rays */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
              {Array.from({ length: 14 }).map((_, i) => {
                const angle = (i / 14) * Math.PI * 2;
                const x2 = 100 + Math.cos(angle) * 96;
                const y2 = 100 + Math.sin(angle) * 96;
                return (
                  <line
                    key={i}
                    x1="100"
                    y1="100"
                    x2={x2}
                    y2={y2}
                    stroke="oklch(0.85 0.18 155)"
                    strokeOpacity="0.35"
                    strokeWidth="1"
                  />
                );
              })}
              <circle cx="100" cy="100" r="40" fill="none" stroke="oklch(0.85 0.18 155 / 0.5)" strokeWidth="1" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="oklch(0.75 0.2 200 / 0.35)" strokeWidth="1" />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
