import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  text?: string;
  /** Path or absolute URL. Defaults to the current page. */
  url?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "secondary";
  label?: string;
};

/**
 * Uses the native share sheet where available (mobile / packaged app),
 * falls back to copying the link on desktop browsers.
 */
export function ShareButton({ title, text, url, size = "sm", variant = "outline", label = "Share" }: Props) {
  const resolve = () => {
    if (typeof window === "undefined") return url ?? "";
    return url ? new URL(url, window.location.origin).toString() : window.location.href;
  };

  const onShare = async () => {
    const link = resolve();
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title, text: text ?? title, url: link });
        return;
      } catch {
        return; // user dismissed the sheet
      }
    }
    try {
      await nav?.clipboard?.writeText(link);
      toast.success("Link copied", { description: link });
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <Button type="button" size={size} variant={variant} onClick={onShare} aria-label={`Share ${title}`}>
      <Share2 className={size === "icon" ? "h-4 w-4" : "mr-2 h-3.5 w-3.5"} />
      {size !== "icon" && label}
    </Button>
  );
}
