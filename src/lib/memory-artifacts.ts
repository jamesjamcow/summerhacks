export type MemoryArtifact = {
  id: string;
  name: string;
  itemType?: "weapon" | "power-up";
  artifactModelUrl?: string;
  /** Legacy image artifacts remain readable after the 3D pipeline migration. */
  artifactImageUrl?: string;
  /** The original UploadThing image that Gemini analyzed, when the source was an image. */
  originalImageUrl?: string;
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
