export const PRACTICAL_DEFAULTS = {
  whatToBring: [
    "Camera for photos",
    "Comfortable walking shoes",
    "Valid ID or passport",
    "Weather-appropriate clothing",
    "Water bottle",
  ],
  whatToWear: [
    "Comfortable walking shoes",
    "Weather-appropriate clothing",
    "Modest attire for religious sites",
    "Layers for varying temperatures",
  ],
  notSuitableFor: [
    "Travelers whose mobility or health requirements are incompatible with the published itinerary",
  ],
  needToKnow: [
    "Keep your booking confirmation available on the day",
    "Pickup details are confirmed before departure",
    "Tell us about dietary, accessibility, or medical requirements before travel",
  ],
  accessibilityInfo: [
    "Limited wheelchair accessibility - please contact us in advance",
    "Service animals are welcome",
    "Please inform us of any special requirements when booking",
  ],
  healthSafety: [
    "First-aid-trained guides",
    "Emergency procedures are in place",
    "Local health and safety guidance is followed",
  ],
  culturalInfo: [
    "Learn about local history and culture",
    "Discover architectural highlights",
    "Experience local traditions with professional guide commentary",
  ],
  localCustoms: [
    "Respect local customs and dress codes",
    "Follow guide instructions at all times",
    "Be respectful of other tour participants",
  ],
  physicalRequirements:
    "Moderate walking may be required. Please review the itinerary and tell us about mobility concerns before booking.",
  transportationDetails:
    "Meeting point and transfer instructions will be provided with the booking confirmation.",
  mealInfo:
    "Meals are not included unless the tour inclusions say otherwise. Please share dietary requirements before travel.",
  weatherPolicy:
    "The tour normally operates in suitable conditions. If severe weather makes the experience unsafe, we will offer a reschedule or refund.",
  photoPolicy:
    "Photography is welcome unless a venue or guide identifies a local restriction. Please respect other guests privacy.",
  tipPolicy: "Gratuities are not included and remain optional.",
  seasonalVariations:
    "Timings and the order of activities may change seasonally while preserving the booked experience.",
} as const;

export type PracticalDefaultKey = keyof typeof PRACTICAL_DEFAULTS;

export function practicalDefaultText(key: PracticalDefaultKey): string {
  const value = PRACTICAL_DEFAULTS[key];
  return typeof value === "string" ? value : value.join("\n");
}
