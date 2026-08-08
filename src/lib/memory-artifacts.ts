export type MemoryArtifact = {
  id: string;
  name: string;
  artifactImageUrl: string;
  originalMemory: string;
  addedBy: string;
};

export type MemoryGenerationResult =
  | {
      status: "complete";
      artifact: MemoryArtifact;
    }
  | {
      status: "failed";
      sourceName: string;
      error: string;
    };
