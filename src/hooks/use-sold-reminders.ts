import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser, useStore, type Book } from "@/lib/mock-store";

const DAY_MS = 24 * 60 * 60 * 1000;
const SNOOZE_KEY_PREFIX = "bl-sold-reminder-snooze:";
const REMINDERS_CHANGED_EVENT = "bl-sold-reminders-changed";
const volatileSnoozes = new Map<string, number>();

function readSnoozedUntil(bookId: string): number {
  if (typeof window === "undefined") return 0;

  try {
    const stored = window.localStorage.getItem(`${SNOOZE_KEY_PREFIX}${bookId}`);
    const timestamp = stored === null ? 0 : Number(stored);
    return Number.isFinite(timestamp) ? timestamp : 0;
  } catch (error) {
    console.error("Could not read sold reminder snooze from localStorage", error);
    return volatileSnoozes.get(bookId) ?? 0;
  }
}

export function useSoldReminders() {
  const { books, enquiries } = useStore();
  const me = useCurrentUser();
  const [now, setNow] = useState(() => Date.now());

  const { reminders, nextRefreshAt } = useMemo(() => {
    const reminders: Book[] = [];
    let nextRefreshAt = Number.POSITIVE_INFINITY;

    for (const book of books) {
      if (book.sellerId !== me.id || book.sold || book.removed) continue;

      let eligible = false;
      for (const enquiry of enquiries) {
        if (
          enquiry.bookId !== book.id ||
          enquiry.sellerId !== me.id ||
          enquiry.status !== "accepted" ||
          !enquiry.decidedAt
        ) {
          continue;
        }

        const decidedAt = Date.parse(enquiry.decidedAt);
        if (!Number.isFinite(decidedAt)) continue;
        const eligibleAt = decidedAt + DAY_MS;
        if (eligibleAt < now) eligible = true;
        else nextRefreshAt = Math.min(nextRefreshAt, eligibleAt + 1);
      }

      if (!eligible) continue;
      const snoozedUntil = readSnoozedUntil(book.id);
      if (snoozedUntil > now) nextRefreshAt = Math.min(nextRefreshAt, snoozedUntil);
      else reminders.push(book);
    }

    return { reminders, nextRefreshAt };
  }, [books, enquiries, me.id, now]);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(SNOOZE_KEY_PREFIX)) refresh();
    };

    window.addEventListener(REMINDERS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(REMINDERS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!Number.isFinite(nextRefreshAt)) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, nextRefreshAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [nextRefreshAt]);

  const notYet = useCallback((bookId: string) => {
    const snoozedUntil = Date.now() + DAY_MS;
    try {
      window.localStorage.setItem(`${SNOOZE_KEY_PREFIX}${bookId}`, String(snoozedUntil));
      volatileSnoozes.delete(bookId);
    } catch (error) {
      console.error("Could not save sold reminder snooze to localStorage", error);
      volatileSnoozes.set(bookId, snoozedUntil);
    }

    setNow(Date.now());
    window.dispatchEvent(new Event(REMINDERS_CHANGED_EVENT));
  }, []);

  return { reminders, notYet };
}
