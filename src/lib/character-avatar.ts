export type CharacterGenerationResult =
  | {
      status: "complete";
      avatarImageUrl: string;
    }
  | {
      status: "failed";
      error: string;
    };
