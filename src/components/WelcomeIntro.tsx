import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import tutorialAsset from "@/assets/tutorial.mp4.asset.json";

const STORAGE_KEY = "mra.welcome.seen";

export function useIntroController() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 250);
      return () => clearTimeout(t);
    }
  }, []);
  return {
    open,
    close: () => {
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "1");
      setOpen(false);
    },
    replay: () => setOpen(true),
  };
}

export default function WelcomeIntro({ open, onClose }: { open: boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  // Sync: auto-play when overlay opens, pause + reset when it closes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (open) {
      v.currentTime = 0;
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [open]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {});
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const onTime = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ perspective: 1400 }}
        >
          <motion.div
            className="absolute inset-0 bg-background/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="glass-panel relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl p-6 sm:p-8"
            initial={{ opacity: 0, y: 30, rotateX: -12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, rotateX: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              A quick tour
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome to Masum Raj Automation
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Watch the tutorial below to see how to navigate the board.
            </p>

            {/* Real video player */}
            <div className="relative mt-5 overflow-hidden rounded-2xl border border-border/40 bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
              <video
                ref={videoRef}
                src={tutorialAsset.url}
                className="block aspect-video w-full"
                playsInline
                muted={muted}
                loop
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={onTime}
                onClick={toggle}
              />

              {/* Play overlay when paused */}
              <AnimatePresence>
                {!playing && (
                  <motion.button
                    onClick={toggle}
                    aria-label="Play"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-[2px]"
                  >
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-[0_10px_40px_-5px_rgba(139,92,246,0.9)] ring-1 ring-white/20">
                      <Play className="h-7 w-7 translate-x-0.5" fill="currentColor" />
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Controls bar */}
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
                <button
                  onClick={toggle}
                  aria-label={playing ? "Pause" : "Play"}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="h-3.5 w-3.5 translate-x-[1px]" fill="currentColor" />}
                </button>
                <div
                  onClick={seek}
                  className="group relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/15"
                >
                  <div
                    className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-[width] duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <button
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Tip: <kbd className="rounded bg-muted px-1.5 py-0.5">/</kbd> search ·{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5">⌘K</kbd> commands ·{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5">N</kbd> new task
              </div>
              <Button
                onClick={onClose}
                className={cn(
                  "bg-gradient-to-r from-primary to-primary/70 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)]",
                )}
              >
                Explore Board
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
