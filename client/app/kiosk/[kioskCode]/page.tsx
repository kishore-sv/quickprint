import { KioskDisplay } from "@/components/kiosk-display/kiosk-display";

export default async function KioskDisplayPage({
  params,
}: PageProps<"/kiosk/[kioskCode]">) {
  const { kioskCode } = await params;
  return <KioskDisplay kioskCode={kioskCode} />;
}
