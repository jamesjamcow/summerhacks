import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-orb auth-orb-two" aria-hidden="true" />

      <section className="auth-intro" aria-labelledby="sign-up-heading">
        <p className="eyebrow">A blank page, in the best way</p>
        <h1 id="sign-up-heading">Make your first page.</h1>
        <p>
          Create an account, open a little room for your idea, and bring the
          people you want to build it with.
        </p>
      </section>

      <div className="auth-card-wrap">
        <SignUp path="/sign-up" signInUrl="/sign-in" />
      </div>
    </main>
  );
}
