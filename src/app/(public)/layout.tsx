import Link from "next/link";
import { brand } from "@/config/brand";

/** Minimal chrome for pages people reach by tapping a card. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="px-4 pb-8 pt-4 text-center text-xs text-moss">
        <Link href="/" className="underline-offset-4 hover:text-ink hover:underline">
          Digital business card by {brand.name}
        </Link>
      </footer>
    </>
  );
}
