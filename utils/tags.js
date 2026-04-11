export function normalizeTagName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function slugifyTag(value) {
  return normalizeTagName(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseTagsInput(input) {
  const rawItems = Array.isArray(input)
    ? input
    : String(input || "")
        .split(",");

  const seen = new Set();
  const tags = [];

  for (const item of rawItems) {
    const name = normalizeTagName(item);
    const slug = slugifyTag(name);

    if (!name || !slug) continue;
    if (seen.has(slug)) continue;

    seen.add(slug);
    tags.push({ name, slug });
  }

  return tags.slice(0, 5);
}
