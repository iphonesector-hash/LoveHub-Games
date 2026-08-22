import { createFileRoute } from "@tanstack/react-router";
import { GameShell } from "@/components/game/GameShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LoveHub Air Force — Cosmic Arcade Shooter" },
      {
        name: "description",
        content:
          "Pilot the Love Energy fighter through three cinematic missions, dodge bullet storms and break multi-phase bosses in this premium mobile-first vertical shooter.",
      },
      { property: "og:title", content: "LoveHub Air Force — Cosmic Arcade Shooter" },
      {
        property: "og:description",
        content:
          "A premium vertical arcade shoot'em-up: auto-firing fighter, five weapons, eight enemy archetypes and three multi-phase bosses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="lh-page">
      <h1 className="sr-only">LoveHub Air Force — premium vertical arcade shooter</h1>
      <GameShell />
    </main>
  );
}
