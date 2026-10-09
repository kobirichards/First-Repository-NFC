import { revalidateTag, updateTag } from "next/cache";
import { logWarn } from "./log";

/** Tag on the cached public catalogue (products, options, prices, stock). */
export const CATALOG_TAG = "catalog";

/** After an admin edit (server action): the next request sees the change. */
export function catalogChangedByAdmin() {
  updateTag(CATALOG_TAG);
}

/**
 * After stock changes from a webhook (route handler). Shoppers may see the old
 * stock level once while it refreshes; adding to the basket re-checks stock.
 */
export function catalogStockChanged() {
  try {
    revalidateTag(CATALOG_TAG, "max");
  } catch (error) {
    // Outside a Next.js request (scripts) there is nothing cached to expire.
    logWarn("cache.catalog", error instanceof Error ? error.message : "revalidateTag failed");
  }
}
