import { auth } from "@clerk/nextjs/server";

import { BookExperience } from "@/components/book/book-experience";

export default async function HomePage() {
  await auth.protect();

  return <BookExperience />;
}
