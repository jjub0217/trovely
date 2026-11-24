import { getLatestBatchId } from "@/lib/instagram-import/actions";
import { ImportClient } from "./import-client";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  const latestBatchId = await getLatestBatchId();
  return <ImportClient initialBatchId={latestBatchId} />;
}
