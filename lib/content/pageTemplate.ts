export const PAGE_TEMPLATES = ["classic", "editorial", "immersive"] as const;

export type PageTemplate = (typeof PAGE_TEMPLATES)[number];

export const PAGE_TEMPLATE_LABELS: Record<
  PageTemplate,
  { title: string; description: string }
> = {
  classic: {
    title: "Classic",
    description:
      "Full-width hero, balanced content sections and a familiar tour grid.",
  },
  editorial: {
    title: "Editorial",
    description:
      "Split hero, generous reading width and a refined magazine-style layout.",
  },
  immersive: {
    title: "Immersive",
    description:
      "Image-led hero, layered content cards and a bolder discovery experience.",
  },
};

export function normalizePageTemplate(value: unknown): PageTemplate {
  return (PAGE_TEMPLATES as readonly unknown[]).includes(value)
    ? (value as PageTemplate)
    : "classic";
}
