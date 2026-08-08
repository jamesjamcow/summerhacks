"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { UploadDropzone } from "@/lib/uploadthing";

export function UploadPanel() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();

  return (
    <div>
      <UploadDropzone
        endpoint="workspaceFile"
        onClientUploadComplete={() => {
          setMessage("Upload complete.");
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
