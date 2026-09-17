"use client";

import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Button } from "@/components/ui/button";
import { PrinterIcon } from "lucide-react";
import { authPageMaxWidthClass } from "@/lib/layout";
import { QuickPrintLogo } from "@/components/quickprint-logo";

export default function SignInPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className={`flex flex-col gap-6 ${authPageMaxWidthClass}`}>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/sign-in" />}
          className="h-auto gap-2 self-center p-0 font-medium normal-case tracking-normal hover:bg-transparent"
        >
          {/* <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <PrinterIcon className="size-4" />
          </div>
          QuickPrint */}
           <QuickPrintLogo className="text-2xl" />
        </Button>
        <LoginForm />
      </div>
    </div>
  );
}
