export function topicPath(topic, mode = "live") {
  return `/t/${topic.id}-${topic.slug}?mode=${encodeURIComponent(mode)}`;
}

export function parseTopicId(idAndSlug) {
  const match = String(idAndSlug || "").match(/^([0-9a-fA-F-]{36})(?:-.+)?$/);
  return match ? match[1] : null;
}
