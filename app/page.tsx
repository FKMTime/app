import { LoginForm } from "@/components/login-form"
import { ModeToggle } from "@/components/mode-toggle"
import Image from "next/image"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
            <div className="flex justify-between w-full rounded-md">
              <ModeToggle />
            </div>
            <Image
              src="/logo.svg"
              alt="FKMTime logo"
              width={300}
              height={128}
            />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs justify-center">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/cover.jpg"
          alt="Image"
          layout="fill"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  )
}
