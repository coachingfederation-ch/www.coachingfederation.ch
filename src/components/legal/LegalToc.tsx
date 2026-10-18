/**
 * Floating table of contents for long legal pages.
 * Exports: LegalToc. Used by src/pages/LegalPageShell.tsx.
 *
 * Builds itself from the h2/h3 headings inside `targetRef` after mount, so the
 * per-language section files need no ids. Highlights the heading currently in
 * view. Desktop: sticky side column. Mobile: collapsed "On this page" bar.
 */
import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/design-system/icf-welcome-design-system-a835df";
import { cn } from "@/lib/utils";

type TocItem = { id: string; text: string; level: 2 | 3 };

function slugify(text: string, used: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "section";
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

function useTocItems(targetRef: React.RefObject<HTMLElement | null>, key: string) {
  const [items, setItems] = React.useState<TocItem[]>([]);
  React.useEffect(() => {
    const root = targetRef.current;
    if (!root) return;
    const used = new Set<string>();
    const found: TocItem[] = [];
    root.querySelectorAll<HTMLHeadingElement>("h2, h3").forEach((h) => {
      const text = h.textContent?.trim() ?? "";
      if (!text) return;
      if (!h.id) h.id = slugify(text, used);
      else used.add(h.id);
      h.classList.add("scroll-mt-24");
      found.push({ id: h.id, text, level: h.tagName === "H2" ? 2 : 3 });
    });
    setItems(found);
  }, [targetRef, key]);
  return items;
}

function useActiveId(items: TocItem[]) {
  const [active, setActive] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);
  return active;
}

function TocList({
  items,
  active,
  onNavigate,
}: {
  items: TocItem[];
  active: string | null;
  onNavigate?: () => void;
}) {
  return (
    <ol className="flex list-none flex-col gap-1 p-0">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            onClick={onNavigate}
            aria-current={active === item.id ? "location" : undefined}
            className={cn(
              "block rounded-md border-l-2 py-1 text-sm leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              item.level === 2 ? "pl-3 font-semibold" : "pl-5",
              active === item.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function LegalToc({
  targetRef,
  label,
  contentKey,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  label: string;
  /** Changes when the article content changes (e.g. locale), to rebuild the list. */
  contentKey: string;
}) {
  const items = useTocItems(targetRef, contentKey);
  const active = useActiveId(items);
  const [open, setOpen] = React.useState(false);
  if (!items.length) return null;

  return (
    <>
      <nav
        aria-label={label}
        className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 lg:block"
      >
        <p className="eyebrow mb-3 text-muted-foreground">{label}</p>
        <TocList items={items} active={active} />
      </nav>

      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="sticky top-0 z-10 border-b border-border/70 bg-background lg:hidden"
      >
        <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-8">
          {label}
          <ChevronDown
            aria-hidden
            className={cn("h-4 w-4 transition-transform motion-reduce:transition-none", open && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="max-h-[60vh] overflow-y-auto px-5 pb-4 sm:px-8">
          <nav aria-label={label}>
            <TocList items={items} active={active} onNavigate={() => setOpen(false)} />
          </nav>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
