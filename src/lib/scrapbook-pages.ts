export type ScrapbookPagePlayer = {
  name: string;
  score: number;
  userId: string;
};

export type ScrapbookPageMemory = {
  addedBy: string;
  artifactImageUrl?: string;
  artifactModelUrl?: string;
  fileType: string;
  id: string;
  name: string;
  originalMemory: string;
  recipientId: string;
  recipientName: string;
  sourceUrl: string;
};

export type ScrapbookMatchPage = {
  completedAt: string;
  id: string;
  matchId: string;
  memories: ScrapbookPageMemory[];
  pageNumber: number;
  players: ScrapbookPagePlayer[];
  resultReason: "score" | "forfeit";
  winnerId: string;
  winnerName: string;
};
