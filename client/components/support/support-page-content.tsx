"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTACT_PHONE,
  LEGAL_CONTACT_PHONE_DISPLAY,
} from "@/lib/legal-meta";
import { SUPPORT_FAQ } from "@/lib/support-faq";
import { Mail, Phone } from "lucide-react";

export function SupportPageContent() {
  return (
    <LegalPageShell
      title="Help & Support"
      description="Contact us with your issue and job number if you have one - we'll help you as soon as we can."
      showLegalDates={false}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <a href={`tel:${LEGAL_CONTACT_PHONE}`} className="group block no-underline">
          <Card className="transition-colors group-hover:border-primary/40">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Phone className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Phone</p>
                <p className="text-sm text-muted-foreground">{LEGAL_CONTACT_PHONE_DISPLAY}</p>
              </div>
            </CardContent>
          </Card>
        </a>

        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="group block no-underline">
          <Card className="transition-colors group-hover:border-primary/40">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="truncate text-sm text-muted-foreground">{LEGAL_CONTACT_EMAIL}</p>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      <section>
        <h2>Common questions</h2>
        <Accordion className="mt-3 rounded-xl border bg-card px-4">
          {SUPPORT_FAQ.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="py-4 text-left hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </LegalPageShell>
  );
}
