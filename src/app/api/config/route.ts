import { handleApiError, json } from "@/lib/api";
import { getPublicConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await getPublicConfig());
  } catch (error) {
    return handleApiError(error);
  }
}
