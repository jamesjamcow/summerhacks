"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { UploadDropzone } from "@/lib/uploadthing";

export function CharacterPhotoUpload({
  onAvatarGenerated,
}: {
  onAvatarGenerated?: (avatarModelUrl: string) => void;
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
            isUploading ? "Building your 3D avatar…" : "Choose photo",
        }}
        onUploadBegin={() => setMessage("Uploading and building your 3D avatar with Gemini…")}
        onClientUploadComplete={(files) => {
          const result = files[0]?.serverData;

          if (result?.status === "complete") {
            setMessage("Your 3D avatar is ready.");
            onAvatarGenerated?.(result.avatarModelUrl);
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
