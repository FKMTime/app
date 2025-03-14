"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Login() {
  const { data: session } = useSession();

  return (
    <div>
      {session ? (
        <>
          <p>Witaj, {session.user?.name}!</p>
          <button onClick={() => signOut()}>Wyloguj</button>
        </>
      ) : (
        <button onClick={() => signIn("wca")}>Zaloguj przez WCA</button>
      )}
    </div>
  );
}
