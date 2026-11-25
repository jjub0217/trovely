import { getLatestBatchId } from "@/lib/instagram-import/actions";
import { RetagClient } from "./retag-client";

export const dynamic = "force-dynamic";

export default async function RetagPage() {
  const batchId = await getLatestBatchId();
  return <RetagClient batchId={batchId} />;
}
