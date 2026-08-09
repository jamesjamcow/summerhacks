export type PageArtwork = "sun" | "orbit" | "waves" | "constellation" | "door" | "final";

export type PageContent = {
  eyebrow: string;
  title: string;
  body: string;
  note?: string;
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
  {
    kicker: "Bring your people",
    title: "Make the room feel alive",
  },
  {
    kicker: "Begin together",
    title: "Your next page starts here",
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
      title: "Summerhacks",
      body: "Strange ideas. Fast friends. One more thing worth staying up for.",
      note: "Turn the corner →",
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
  {
    front: {
      eyebrow: "A room with a pulse",
      title: "Every page is a lobby.",
      body: "It is the place everyone lands before the build begins. One link, one shared context, one less tab to lose.",
      note: "Small rooms make bold work.",
      artwork: "waves",
      accent: "#7f87df",
    },
    back: {
      eyebrow: "02 / Bring your people",
      title: "The right crew changes the shape of an idea.",
      body: "Share the code with friends, teammates, or someone you just met. The page gets better every time a new perspective walks in.",
      note: "Leave a seat open.",
      artwork: "constellation",
      accent: "#ed6459",
    },
  },
  {
    front: {
      eyebrow: "One link. One place.",
      title: "Make the first move feel easy.",
      body: "Create a page when you have the idea. Join one when someone else has the spark. Either way, begin before it feels finished.",
      note: "The best builds start a little early.",
      artwork: "orbit",
      accent: "#8e91ef",
    },
    back: {
      eyebrow: "03 / Begin together",
      title: "There is no wrong first line.",
      body: "A room is only empty until somebody enters. Pick a page, invite a person, and give the idea a chance to surprise you.",
      note: "See you on the other side.",
      artwork: "sun",
      accent: "#f08a62",
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
