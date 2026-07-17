import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import type { Book } from "@/lib/mock-store";
import { Badge } from "@/components/ui/badge";

const conditionTone: Record<Book["condition"], string> = {
  "New": "bg-accent/15 text-accent border-accent/30",
  "Like New": "bg-primary/15 text-primary border-primary/30",
  "Good": "bg-secondary text-secondary-foreground border-border",
  "Fair": "bg-muted text-muted-foreground border-border",
};

export function BookCard({ book }: { book: Book }) {
  const hero = book.photos[0];
  return (
    <Link
      to="/book/$id"
      params={{ id: book.id }}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="paper-grain relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-secondary/60 text-6xl">
        {hero
          ? <img src={hero} alt={book.title} className="h-full w-full object-cover" />
          : <span className="drop-shadow-sm">{book.cover}</span>}
        <Badge className={`absolute right-2 top-2 border ${conditionTone[book.condition]}`} variant="outline">
          {book.condition}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="font-display text-base leading-tight text-foreground">{book.title}</div>
        <div className="text-xs text-muted-foreground">{book.author}</div>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <div className="font-semibold text-foreground">₹{book.price}</div>
            {book.rentPerWeek && (
              <div className="text-[11px] text-muted-foreground">or ₹{book.rentPerWeek}/wk</div>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {book.area}
          </div>
        </div>
      </div>
    </Link>
  );
}
