export type PageArtwork = "sun" | "orbit" | "waves" | "constellation" | "door" | "final";

export type PageContent = {
  eyebrow: string;
  title: string;
  body: string;
  note?: string;
  noteStrong?: string;
  navigation?: readonly string[];
  artwork: PageArtwork;
  accent: string;
};

export const BOOK_SPREADS = [
  {
    kicker: "Welcome",
    title: "A summer made of side quests",
  },
  {
    kicker: "Open a page",
    title: "Give the idea a room",
  },
] as const;

export const TOTAL_SPREADS = BOOK_SPREADS.length;

export const STATIC_LEFT_PAGE: PageContent = {
  eyebrow: "Summer / Twenty-six",
  title: "Hey there!",
  body: "A shared page is a tiny lobby for an idea. Open one, invite your people, and see where the night takes you.",
  navigation: ["Photos", "Friends", "Settings"],
  artwork: "sun",
  accent: "#ed6459",
};

export const PAGE_LEAVES: Array<{ front: PageContent; back: PageContent }> = [
  {
    front: {
      eyebrow: "A little book of",
      title: "Scrapshot",
      body: "Most social apps let you decide how the world sees you. You choose the photos, write the bio, and build the profile. We thought it would be way more fun if you had absolutely no control.",
      note: "Scrapshot started with a simple idea:",
      noteStrong: "what if your friends built your character from the memories they have of you?",
      artwork: "orbit",
      accent: "#f1a26f",
    },
    back: {
      eyebrow: "01 / Open a page",
      title: "Give the idea somewhere to live.",
      body: "Name the room before you know every answer. A page holds the prompt, the people, and the small sparks that show up next.",
      note: "Start with a sentence.",
      artwork: "door",
      accent: "#c66b52",
    },
  },
];

export const FINAL_PAGE: PageContent = {
  eyebrow: "The last page",
  title: "Your next page starts here.",
  body: "Open a new room or arrive with a code.",
  artwork: "final",
  accent: "#ed6459",
};
