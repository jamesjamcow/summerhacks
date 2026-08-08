import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-orb auth-orb-two" aria-hidden="true" />

      <section className="auth-intro" aria-labelledby="sign-in-heading">
        <p className="eyebrow">Your next chapter is waiting</p>
        <h1 id="sign-in-heading">Come back to the page.</h1>
        <p>
          Sign in before opening the book. Every shared page starts with a
          person, a small idea, and room for someone else.
        </p>
      </section>

      <div className="auth-card-wrap">
        <SignIn path="/sign-in" signUpUrl="/sign-up" />
      </div>
    </main>
  );
}
