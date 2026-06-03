import { getCalls } from "@/lib/data/calls";
import { CallExplorer } from "@/components/calls/call-explorer";

export default async function CallsPage() {
  const calls = await getCalls();
  return <CallExplorer calls={calls} />;
}
