import { auth, currentUser } from "@clerk/nextjs/server";

import { BookExperience } from "@/components/book/book-experience";

export default async function HomePage() {
  await auth.protect();
  const user = await currentUser();

  if (!user) return null;

  const name =
    user.fullName ||
    user.username ||
    user.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Memory keeper";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return <BookExperience viewer={{ id: user.id, initials, name }} />;
}
