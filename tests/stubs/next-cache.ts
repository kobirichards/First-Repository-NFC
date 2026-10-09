/** `next/cache` needs a Next.js request; in Vitest caching is off, so these are no-ops. */
export const cacheTag = () => {};
export const cacheLife = () => {};
export const updateTag = () => {};
export const revalidateTag = () => {};
export const revalidatePath = () => {};
export const refresh = () => {};
