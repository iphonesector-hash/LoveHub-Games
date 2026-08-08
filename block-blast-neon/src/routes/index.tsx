import { createFileRoute } from "@tanstack/react-router";
import { BlockBlastGame } from "@/components/game/BlockBlastGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Block Blast Neon — بازی پازل بلوکی LoveHub" },
      {
        name: "description",
        content:
          "پازل بلوکی نئونی از تیم SECTOR برای پلتفرم LoveHub: چهار حالت بازی، سه درجه سختی، ۵ فصل و ۳۰ مرحله، دستاورد، XP، سکه و پاور-آپ.",
      },

      { property: "og:title", content: "Block Blast Neon — پازل بلوکی با ۳۰ مرحله" },
      {
        property: "og:description",
        content: "پازل بلوکی نئونی با ۳۰ مرحله، کمبو و افکت‌های درخشان. همین حالا بازی کن.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="game-shell min-h-[100dvh] w-full">
      <h1 className="sr-only">Block Blast Neon — بازی پازل بلوکی</h1>
      <BlockBlastGame />
    </main>
  );
}
