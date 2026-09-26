import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { readPactHash, type PactSnapshot } from "@/lib/habits/pact";

export function PactView() {
  const [snap, setSnap] = useState<PactSnapshot | null>(null);

  useEffect(() => {
    setSnap(readPactHash());
    const onHash = () => setSnap(readPactHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (!snap) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <p className="font-display text-3xl font-medium italic">Pact</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {snap.from} · {snap.date}
        </p>
        <p className="mt-6 font-display text-4xl tabular-nums">
          {snap.today.done}/{snap.today.total}
        </p>
        <p className="text-sm text-muted-foreground">today · week score {snap.score}</p>
        <ul className="mt-6 grid gap-2">
          {snap.rites.map((rite) => (
            <li key={rite.n} className="flex justify-between rounded-lg bg-card px-3 py-2 shadow-card">
              <span>{rite.n}</span>
              <span className="text-muted-foreground">{rite.d ? "kept" : "—"}</span>
            </li>
          ))}
        </ul>
        <Button
          className="mt-8"
          variant="outline"
          onClick={() => {
            history.replaceState(null, "", window.location.pathname);
            setSnap(null);
          }}
        >
          Close
        </Button>
      </div>
    </div>
  );
}
