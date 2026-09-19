"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LandingSection } from "@/components/landing/landing-section";
import { landingFaqItems } from "@/lib/support-faq";

export function FaqSection() {
  const faqs = landingFaqItems();

  return (
    <LandingSection id="faq">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">Answers based on how QuickPrint works today.</p>
      </div>
      <Accordion className="mx-auto mt-10 max-w-3xl rounded-2xl border bg-card px-4 md:px-6">
        {faqs.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id}>
            <AccordionTrigger className="py-4 text-base hover:no-underline">{faq.question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </LandingSection>
  );
}
