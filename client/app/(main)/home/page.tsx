import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import HomePageContent from "./home-content";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Spinner className="size-8 text-primary" />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
