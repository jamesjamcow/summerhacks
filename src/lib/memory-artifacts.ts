export type MemoryArtifact = {
  id: string;
  name: string;
  artifactModelUrl?: string;
  /** Legacy image artifacts remain readable after the 3D pipeline migration. */
  artifactImageUrl?: string;
  originalMemory: string;
  addedBy: string;
  recipientId: string;
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
