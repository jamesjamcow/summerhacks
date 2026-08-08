"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { UploadDropzone } from "@/lib/uploadthing";
import type { MemoryArtifact } from "@/lib/memory-artifacts";

export function UploadPanel({
  onArtifactsGenerated,
}: {
  onArtifactsGenerated?: (artifacts: MemoryArtifact[]) => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [artifacts, setArtifacts] = useState<MemoryArtifact[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);

  return (
    <div>
      <UploadDropzone
        endpoint="workspaceFile"
        content={{
          label: "Choose memories or drag and drop",
          allowedContent: "Up to 5 images, voice notes, PDFs, or text files",
          button: ({ isUploading }) =>
            isUploading ? "Making keepsakes…" : "Choose files",
        }}
        onChange={(files) => {
          setSelectedCount(files.length);
          setMessage(undefined);
        }}
        onUploadBegin={() => {
          setMessage(
            `Uploading and illustrating ${selectedCount || 1} ${
              (selectedCount || 1) === 1 ? "memory" : "memories"
            }…`,
          );
        }}
        onClientUploadComplete={(files) => {
          const completed = files.flatMap((file) =>
            file.serverData.status === "complete" ? [file.serverData.artifact] : [],
          );
          const failures = files.filter(
            (file) => file.serverData.status === "failed",
          );
          const firstFailure = failures[0]?.serverData;

          if (completed.length) {
            setArtifacts((current) => {
              const byId = new Map(current.map((artifact) => [artifact.id, artifact]));
              completed.forEach((artifact) => byId.set(artifact.id, artifact));
              return Array.from(byId.values());
            });
            onArtifactsGenerated?.(completed);
          }

          setMessage(
            failures.length
              ? `${completed.length} ${completed.length === 1 ? "keepsake" : "keepsakes"} ready. ${
                  firstFailure?.status === "failed"
                    ? firstFailure.error
                    : `${failures.length} could not be illustrated.`
                }`
              : `${completed.length} ${completed.length === 1 ? "keepsake is" : "keepsakes are"} ready.`,
          );
          router.refresh();
        }}
        onUploadError={(error) => setMessage(error.message)}
      />
      {message ? (
        <p className="upload-message" role="status">
          {message}
        </p>
      ) : null}
      {artifacts.length ? (
        <div className="generated-artifacts" aria-label="Generated keepsakes">
          {artifacts.map((artifact) => (
            <article className="generated-artifact" key={artifact.id}>
              <div
                aria-label={`Generated ${artifact.name} illustration`}
                className="generated-artifact-image"
                role="img"
                style={{ backgroundImage: `url(${artifact.artifactImageUrl})` }}
              />
              <div>
                <span>Memory object</span>
                <strong>{artifact.name}</strong>
                <small>From {artifact.originalMemory}</small>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
