import { cn } from "@/lib/utils";

type LandingSectionProps = {
  id?: string;
  className?: string;
  children: React.ReactNode;
};

export function LandingSection({ id, className, children }: LandingSectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-20 px-4 py-24 md:py-32", className)}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}
