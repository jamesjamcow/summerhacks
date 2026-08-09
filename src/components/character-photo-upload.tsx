"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { UploadDropzone } from "@/lib/uploadthing";

export function CharacterPhotoUpload({
  onAvatarGenerated,
}: {
  onAvatarGenerated?: (avatarUrl: string) => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();

  return (
    <div className="character-photo-upload">
      <UploadDropzone
        className="character-photo-dropzone"
        endpoint="characterPhoto"
        content={{
          label: "Choose a photo of yourself",
          allowedContent: "One image, up to 4MB",
          button: ({ isUploading }) =>
            isUploading ? "Drawing your character…" : "Choose photo",
        }}
        onUploadBegin={() => setMessage("Uploading and drawing your character…")}
        onClientUploadComplete={(files) => {
          const result = files[0]?.serverData;

          if (result?.status === "complete") {
            setMessage("Your character is ready.");
            onAvatarGenerated?.(result.avatarImageUrl);
          } else if (result?.status === "failed") {
            setMessage(result.error);
          }

          router.refresh();
        }}
        onUploadError={(error) => setMessage(error.message)}
      />
      {message ? (
        <p className="upload-message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
