import type { SeoPage } from "./types";
import { isReservedSlug } from "./reserved-slugs";

function trimCheck(s: string, field: string, slug: string): void {
  if (typeof s !== "string" || !s.trim()) {
    throw new Error(`[seo] Page "${slug}": ${field} must be a non-empty string.`);
  }
}

/**
 * Validates the full SEO pages dataset. Call at module init (e.g. end of pages.ts).
 */
export function assertValidSeoPages(pages: SeoPage[]): void {
  const slugs = new Set<string>();
  const bySlug = new Map<string, SeoPage>();

  for (const page of pages) {
    trimCheck(page.slug, "slug", page.slug || "(missing slug)");
    trimCheck(page.title, "title", page.slug);
    trimCheck(page.description, "description", page.slug);
    trimCheck(page.h1, "h1", page.slug);
    trimCheck(page.intro, "intro", page.slug);
    trimCheck(page.useCase, "useCase", page.slug);

    const slug = page.slug.trim();
    if (slug !== page.slug) {
      throw new Error(`[seo] Page slug must be trimmed: "${page.slug}"`);
    }

    if (isReservedSlug(slug)) {
      throw new Error(
        `[seo] Page "${slug}": slug is reserved (conflicts with app route).`
      );
    }

    if (slugs.has(slug)) {
      throw new Error(`[seo] Duplicate slug: "${slug}"`);
    }
    slugs.add(slug);
    bySlug.set(slug, page);
  }

  for (const page of pages) {
    for (const rel of page.related) {
      if (typeof rel !== "string" || !rel.trim()) {
        throw new Error(`[seo] Page "${page.slug}": related contains empty entry.`);
      }
      if (rel !== rel.trim()) {
        throw new Error(`[seo] Page "${page.slug}": related slug must be trimmed: "${rel}"`);
      }
      if (!bySlug.has(rel)) {
        throw new Error(
          `[seo] Page "${page.slug}": related slug "${rel}" does not match any page.`
        );
      }
      if (rel === page.slug) {
        throw new Error(`[seo] Page "${page.slug}": cannot relate to itself.`);
      }
    }
  }
}
