import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ShareButton } from "@/components/share-button";

const SESSION_KEY = "book-ledger-welcome-session-counted";
const VISIT_COUNT_KEY = "book-ledger-welcome-visit-count";

const slides = [
  {
    tag: "PASS IT ON",
    title: "Every book has a next chapter.",
    description: "Welcome to Book Ledger — where every book finds its next reader.",
  },
  {
    tag: "READ TOGETHER",
    title: "Share a little. Find a lot.",
    description:
      "Tell your reading circle what you’re looking for. The more readers share, the sooner the right books find their way to you.",
  },
];

export function WelcomeCarousel() {
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
      window.sessionStorage.setItem(SESSION_KEY, "1");

      const savedCount = window.localStorage.getItem(VISIT_COUNT_KEY);
      const previousCount = savedCount === null ? 0 : Number(savedCount);
      const countIsValid = Number.isSafeInteger(previousCount) && previousCount >= 0;
      const visitNumber = countIsValid ? previousCount + 1 : 1;

      if (savedCount !== null && !countIsValid) {
        console.warn("Invalid welcome visit count; starting a new count.");
      }

      window.localStorage.setItem(VISIT_COUNT_KEY, String(visitNumber));
      setOpen(visitNumber === 1 || (visitNumber - 1) % 3 === 0);
    } catch (error) {
      console.error("Could not save welcome carousel visit state", error);
      setOpen(true);
    }
  }, []);

  const moveSlide = (direction: -1 | 1) => {
    setSlide((current) => Math.min(slides.length - 1, Math.max(0, current + direction)));
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    moveSlide(deltaX < 0 ? 1 : -1);
  };

  const currentSlide = slides[slide];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] max-w-md overflow-y-auto rounded-3xl border-0 bg-transparent p-0 shadow-2xl [&>button]:hidden">
        <div
          className="touch-pan-y overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative overflow-hidden bg-primary px-6 pb-7 pt-6 text-primary-foreground">
            <div
              aria-hidden="true"
              className="absolute -right-10 -top-14 h-44 w-44 rounded-full border-[24px] border-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-white/5"
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/book-ledger-icon.svg" alt="" className="h-9 w-9 rounded-lg" />
                <span className="font-display text-lg font-semibold">Book Ledger</span>
              </div>
              <span className="rounded-full border border-white/25 px-3 py-1 text-[10px] font-semibold tracking-[0.18em]">
                {currentSlide.tag}
              </span>
            </div>
            <div aria-hidden="true" className="relative mt-8 flex h-16 items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
                {slide === 0 ? <BookOpen className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
              </div>
              <div className="h-px w-12 bg-white/40" />
              <div className="grid h-11 w-11 place-items-center rounded-full border border-white/40 bg-white/10">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-7 sm:px-8">
            <div aria-live="polite" aria-atomic="true">
              <DialogTitle className="font-display text-3xl leading-tight tracking-tight text-foreground">
                {currentSlide.title}
              </DialogTitle>
              <DialogDescription className="mt-3 text-sm leading-6 text-muted-foreground">
                {currentSlide.description}
              </DialogDescription>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <div className="flex items-center gap-2" aria-label={`Card ${slide + 1} of 2`}>
                {slides.map((item, index) => (
                  <button
                    key={item.tag}
                    type="button"
                    aria-label={`Go to card ${index + 1}`}
                    aria-current={slide === index ? "step" : undefined}
                    onClick={() => setSlide(index)}
                    className={`h-2 rounded-full transition-all ${
                      slide === index
                        ? "w-7 bg-accent"
                        : "w-2 bg-border hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
                <span className="ml-1 text-xs text-muted-foreground">{slide + 1} of 2</span>
              </div>

              {slide === 0 ? (
                <Button onClick={() => moveSlide(1)} className="gap-2">
                  Next <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Previous card"
                    onClick={() => moveSlide(-1)}
                  >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  </Button>
                  <ShareButton
                    title="Book Ledger"
                    text="Every book has a next chapter. Find yours on Book Ledger."
                    url="/"
                    label="Share"
                  />
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-border pt-4 text-center">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
