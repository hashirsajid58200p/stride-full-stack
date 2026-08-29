/**
 * Creates a clean SEO-friendly slug from brand, product name, and id.
 * Format: "nike-air-max-90-uuid" or "air-max-90-uuid"
 */
export function createProductSlug(product) {
  if (!product) return "";
  const brand = (product.brand || "").toLowerCase().trim();
  const name = (product.name || "").toLowerCase().trim();
  const id = product.id || "";

  const slugText = `${brand} ${name}`
    .replace(/[^\w\s-]/g, "") // remove non-alphanumeric except whitespace and hyphens
    .replace(/\s+/g, "-") // collapse whitespace to hyphens
    .replace(/-+/g, "-"); // collapse multiple hyphens

  return `${slugText}-${id}`.replace(/^-+|-+$/g, "");
}

/**
 * Extracts UUID from slug (assuming UUID at the end, or the whole slug is a UUID)
 */
export function extractIdFromSlug(slug) {
  if (!slug) return null;

  // Check if entire slug is already a UUID
  const uuidRegex = /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;
  const match = slug.match(uuidRegex);
  if (match) return match[1];

  // Check for 8-character ID prefix or numeric ID at end
  const parts = slug.split("-");
  return parts[parts.length - 1];
}
