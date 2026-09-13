"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LandingSection } from "@/components/landing/landing-section";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal-meta";

const faqs = [
  {
    id: "file-types",
    question: "What file types can I print?",
    answer:
      "QuickPrint supports PDF documents and common image formats. Upload from your phone, review your files, and confirm before sending the job to the kiosk.",
  },
  {
    id: "payment",
    question: "How do I pay for my print job?",
    answer:
      "You pay online through our secure checkout (powered by Razorpay) after choosing your print settings. Your job is sent to the kiosk once payment is complete.",
  },
  {
    id: "tracking",
    question: "Can I track my print job?",
    answer:
      "Yes. After you submit a job, you can follow its status — from queued and printing through to ready for pickup — on the status page in the app.",
  },
  {
    id: "cancel",
    question: "Can I cancel an unpaid job?",
    answer:
      "If you have not completed payment yet, you can cancel the job from the app. Once paid, cancellation may not be available if printing has already started.",
  },
  {
    id: "failure",
    question: "What if my print fails?",
    answer: `If something goes wrong with your print, check the job status for details. For help, contact us at ${LEGAL_CONTACT_EMAIL} and include your job reference if you have one.`,
  },
];

export function FaqSection() {
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
