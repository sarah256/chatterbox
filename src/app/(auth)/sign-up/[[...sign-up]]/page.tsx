import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense>
        <SignUp />
      </Suspense>
    </main>
  );
}
