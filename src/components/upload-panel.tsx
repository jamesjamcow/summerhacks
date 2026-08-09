"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { MemoryModelPreview } from "@/components/memory-model-preview";
import { uploadFiles } from "@/lib/uploadthing";
import type { MemoryArtifact } from "@/lib/memory-artifacts";

const MAX_FILES = 5;
const MAX_PARALLEL_UPLOADS = 3;
const ACCEPTED_FILE_TYPES = "image/*,audio/*,.pdf,text/*,.txt,.md,.csv,.json,.xml";

type UploadResult = Awaited<ReturnType<typeof uploadFiles<"workspaceFile">>>[number];

function generationResult(result: UploadResult) {
  return result.serverData;
}

export function UploadPanel({
  onArtifactsGenerated,
  recipientName,
  recipientUserId,
  roomCode,
  variant = "dropzone",
}: {
  onArtifactsGenerated?: (artifacts: MemoryArtifact[]) => void;
  recipientName?: string;
  recipientUserId?: string;
  roomCode?: string;
  variant?: "dropzone" | "ticket";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>();
  const [artifacts, setArtifacts] = useState<MemoryArtifact[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [finishedCount, setFinishedCount] = useState(0);

  function chooseFiles(files: File[]) {
    if (files.length > MAX_FILES) {
      setSelectedFiles([]);
      setMessage(`Choose no more than ${MAX_FILES} memories at a time.`);
      return false;
    }

    setSelectedFiles(files);
    setFinishedCount(0);
    setMessage(undefined);
    return files.length > 0;
  }

  function addCompletedArtifact(artifact: MemoryArtifact) {
    setArtifacts((current) => {
      const byId = new Map(current.map((item) => [item.id, item]));
      byId.set(artifact.id, artifact);
      return Array.from(byId.values());
    });
    onArtifactsGenerated?.([artifact]);
  }

  async function uploadSelectedFiles(filesToUpload = selectedFiles) {
    if (!filesToUpload.length || isUploading) return;

    const files = [...filesToUpload];
    const results: Array<UploadResult | Error> = new Array(files.length);
    let nextIndex = 0;

    setIsUploading(true);
    setFinishedCount(0);
    setMessage(
      `Uploading and building ${files.length} ${files.length === 1 ? "memory" : "memories"} in parallel…`,
    );

    async function worker() {
      while (nextIndex < files.length) {
        const index = nextIndex;
        nextIndex += 1;

        try {
          const [result] = await uploadFiles("workspaceFile", {
            files: [files[index]],
            input: {
              recipientUserId: recipientUserId ?? null,
              roomCode: roomCode ?? null,
            },
          });

          if (!result) {
            throw new Error(`${files[index].name} did not return an upload result.`);
          }

          results[index] = result;
          const serverData = generationResult(result);
          if (serverData.status === "complete") {
            addCompletedArtifact(serverData.artifact);
          }
        } catch (error) {
          results[index] = error instanceof Error
            ? error
            : new Error(`${files[index].name} could not be uploaded.`);
        } finally {
          setFinishedCount((current) => current + 1);
        }
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(MAX_PARALLEL_UPLOADS, files.length) },
        () => worker(),
      ),
    );

    const completed = results.filter(
      (result): result is UploadResult =>
        !(result instanceof Error) && generationResult(result).status === "complete",
    );
    const generationFailures = results.flatMap((result) => {
      if (result instanceof Error) return [result.message];
      const serverData = generationResult(result);
      return serverData.status === "failed" ? [serverData.error] : [];
    });

    setMessage(
      generationFailures.length
        ? `${completed.length} ${completed.length === 1 ? "keepsake" : "keepsakes"} ready. ${generationFailures.length} failed: ${generationFailures[0]}`
        : `${completed.length} ${completed.length === 1 ? "keepsake is" : "keepsakes are"} ready.`,
    );
    setSelectedFiles([]);
    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  if (variant === "ticket") {
    const recipientLabel = recipientName ?? "this member";

    return (
      <div className="direct-memory-upload">
        <input
          ref={inputRef}
          accept={ACCEPTED_FILE_TYPES}
          aria-label={`Choose memories for ${recipientLabel}`}
          className="sr-only"
          disabled={isUploading}
          multiple
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            if (chooseFiles(files)) void uploadSelectedFiles(files);
          }}
          type="file"
        />
        <button
          aria-describedby={message ? "direct-memory-upload-status" : undefined}
          aria-busy={isUploading}
          className={`memory-upload-ticket${isDragging ? " is-dragging" : ""}`}
          disabled={isUploading}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!isUploading) setIsDragging(true);
          }}
          onDragLeave={(event) => {
            const nextTarget = event.relatedTarget;
            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
              setIsDragging(false);
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const files = Array.from(event.dataTransfer.files);
            if (!isUploading && chooseFiles(files)) void uploadSelectedFiles(files);
          }}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <span className="memory-upload-ticket-copy">
            <strong>{isUploading ? `Building ${finishedCount}/${selectedFiles.length}…` : "Upload file"}</strong>
            <span>
              {isUploading
                ? `Creating ${selectedFiles.length === 1 ? "a keepsake" : "keepsakes"} for ${recipientLabel}`
                : "Drag or drop your files here or click to upload"}
            </span>
          </span>
          <span className="memory-upload-ticket-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M5.5 14.5v3.25A2.25 2.25 0 0 0 7.75 20h8.5a2.25 2.25 0 0 0 2.25-2.25V14.5" />
            </svg>
          </span>
          <span className="memory-upload-ticket-cta" aria-hidden="true">
            {isUploading ? "Uploading" : `Add for ${recipientLabel}`}
          </span>
        </button>
        {message ? (
          <p className="upload-message" id="direct-memory-upload-status" role="status">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`parallel-upload-dropzone${isDragging ? " is-dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isUploading) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          const nextTarget = event.relatedTarget;
          if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
            setIsDragging(false);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!isUploading) chooseFiles(Array.from(event.dataTransfer.files));
        }}
        aria-busy={isUploading}
      >
        <svg aria-hidden="true" className="parallel-upload-icon" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765a4.5 4.5 0 0 1 8.302-3.046a3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z"
            fill="currentColor"
            fillRule="evenodd"
          />
        </svg>
        <label className="parallel-upload-label">
          <input
            ref={inputRef}
            accept={ACCEPTED_FILE_TYPES}
            className="sr-only"
            disabled={isUploading}
            multiple
            onChange={(event) => chooseFiles(Array.from(event.currentTarget.files ?? []))}
            type="file"
          />
          Choose memories or drag and drop
        </label>
        <span className="parallel-upload-help">
          {selectedFiles.length
            ? `${selectedFiles.length} ${selectedFiles.length === 1 ? "file" : "files"} selected`
            : "Up to 5 images, voice notes, PDFs, or text files"}
        </span>
        <button
          className="parallel-upload-button"
          disabled={!selectedFiles.length || isUploading}
          onClick={() => void uploadSelectedFiles()}
          type="button"
        >
          {isUploading
            ? `Building ${finishedCount}/${selectedFiles.length}…`
            : selectedFiles.length
              ? `Upload ${selectedFiles.length} ${selectedFiles.length === 1 ? "file" : "files"}`
              : "Choose files"}
        </button>
      </div>
      {message ? (
        <p className="upload-message" role="status">
          {message}
        </p>
      ) : null}
      {artifacts.length ? (
        <div className="generated-artifacts" aria-label="Generated keepsakes">
          {artifacts.map((artifact) => (
            <article className="generated-artifact" key={artifact.id}>
              {artifact.artifactModelUrl ? (
                <MemoryModelPreview
                  className="generated-artifact-image"
                  modelUrl={artifact.artifactModelUrl}
                  name={artifact.name}
                />
              ) : (
                <div
                  aria-label={`Legacy illustration of ${artifact.name}`}
                  className="generated-artifact-image legacy-artifact-image"
                  role="img"
                  style={artifact.artifactImageUrl
                    ? { backgroundImage: `url(${artifact.artifactImageUrl})` }
                    : undefined}
                />
              )}
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
