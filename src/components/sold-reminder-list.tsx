import { toast } from "sonner";
import { useStore, type Book } from "@/lib/mock-store";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type SoldReminderListProps = {
  reminders: Book[];
  onNotYet: (bookId: string) => void;
  variant: "banner" | "notification";
};

export function SoldReminderList({ reminders, onNotYet, variant }: SoldReminderListProps) {
  const { markBookSold } = useStore();
  if (reminders.length === 0) return null;

  const markSold = async (book: Book) => {
    try {
      await markBookSold(book.id, true);
      toast.success(`"${book.title}" marked sold`);
    } catch (error) {
      toast.error("Could not mark this book sold", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <section className={variant === "banner" ? "mb-6 grid gap-3" : "border-b border-border p-3"}>
      {variant === "notification" && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sold reminders
        </div>
      )}
      <ul className={variant === "banner" ? "grid gap-3" : "space-y-2"}>
        {reminders.map((book) => (
          <li key={book.id}>
            <Alert className="border-accent/40 bg-accent/5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  Did you sell &quot;{book.title}&quot;? Mark it sold so it leaves the shop.
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => markSold(book)}>
                    Mark sold
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onNotYet(book.id)}>
                    Not yet
                  </Button>
                </div>
              </div>
            </Alert>
          </li>
        ))}
      </ul>
    </section>
  );
}
