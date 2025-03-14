"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { signIn } from "next-auth/react";

export function LoginForm() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-2xl font-bold">Log in to FKMTime app</h1>
      <Button variant="outline" className="w-full" onClick={() => signIn('wca', { redirectTo: "/dashboard", })}>
        <Image
          src="/wca.svg"
          alt="WCA logo"
          width={24}
          height={24}
        />
        Login with WCA
      </Button>
    </div>
  )
}
