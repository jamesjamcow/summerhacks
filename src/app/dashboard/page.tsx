import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { UploadPanel } from "@/components/upload-panel";
import { getDb } from "@/db";
import { notes, uploads } from "@/db/schema";

async function createNote(formData: FormData) {
  "use server";

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const content = String(formData.get("content") ?? "").trim();
  if (!content || content.length > 500) return;

  await getDb().insert(notes).values({ clerkUserId: userId, content });
  revalidatePath("/dashboard");
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [userNotes, userUploads] = await Promise.all([
    getDb()
      .select()
      .from(notes)
      .where(eq(notes.clerkUserId, userId))
      .orderBy(desc(notes.createdAt))
      .limit(20),
    getDb()
      .select()
      .from(uploads)
      .where(eq(uploads.clerkUserId, userId))
      .orderBy(desc(uploads.createdAt))
      .limit(20),
  ]);

  return (
    <main className="dashboard-page">
      <div className="dashboard-intro">
        <p className="dashboard-kicker">
          Private workspace
        </p>
        <h1>Your dashboard</h1>
        <p className="dashboard-copy">
          Notes are stored in Neon. Files are stored by UploadThing, with their
          metadata tied to your Clerk user in Neon.
        </p>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <h2>Notes</h2>
          <form action={createNote} className="dashboard-form">
            <label className="sr-only" htmlFor="content">
              New note
            </label>
            <input
              className="dashboard-input"
              id="content"
              name="content"
              maxLength={500}
              placeholder="Write a short note…"
              required
            />
            <button className="dashboard-button">
              Add
            </button>
          </form>

          <div className="dashboard-list">
            {userNotes.length ? (
              userNotes.map((note) => (
                <article className="dashboard-item" key={note.id}>
                  <p>{note.content}</p>
                  <time>
                    {note.createdAt.toLocaleString()}
                  </time>
                </article>
              ))
            ) : (
              <p className="dashboard-empty">
                No notes yet. Add one to test the Neon connection.
              </p>
            )}
          </div>
        </section>

        <section className="dashboard-panel">
          <h2>Files</h2>
          <p className="dashboard-panel-copy">
            Upload one image, PDF, or text file at a time.
          </p>
          <div className="dashboard-uploader">
            <UploadPanel />
          </div>

          <div className="dashboard-list">
            {userUploads.length ? (
              userUploads.map((file) => (
                <a
                  className="dashboard-file"
                  href={file.fileUrl}
                  key={file.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="dashboard-file-name">
                    {file.fileName}
                  </span>
                  <span className="dashboard-file-size">
                    {(file.fileSize / 1024).toFixed(1)} KB
                  </span>
                </a>
              ))
            ) : (
              <p className="dashboard-empty">
                No files yet. Upload one to test the storage flow.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
