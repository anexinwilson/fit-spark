import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <section className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-slate-50 px-4 py-10">
      <SignUp />
    </section>
  );
}
