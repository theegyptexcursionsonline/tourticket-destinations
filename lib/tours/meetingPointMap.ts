export function meetingPointMapUrl(meetingPoint: unknown): string | null {
  if (typeof meetingPoint !== "string") return null;
  const query = meetingPoint.trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function meetingPointEmbedUrl(meetingPoint: unknown): string | null {
  if (typeof meetingPoint !== "string") return null;
  const query = meetingPoint.trim();
  if (!query) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}
