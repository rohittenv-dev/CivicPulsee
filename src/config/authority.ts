/**
 * Single source of truth for the municipal authority this deployment represents.
 * Relabel CivicPulse for another city by editing this file only — never hardcode
 * an authority or city name inside a component.
 */
export const authority = {
  productName: "CivicPulse",
  city: "Mumbai",
  state: "Maharashtra",
  authorityName: "Brihanmumbai Municipal Corporation",
  authorityShortName: "BMC",
  helpline: "1800-CIVIC-00",
  /** Working days allowed before an issue is considered overdue and auto-escalates. */
  slaDays: 14,
  /** Prefix for human-readable tracking IDs, e.g. CP-7K3QD2 */
  trackingPrefix: "CP",
  /** Geographic centre of the jurisdiction — used by every map view. */
  centre: { lat: 19.076, lng: 72.8777 },
} as const;

export const departments = [
  { slug: "roads", name: "Roads & Transport" },
  { slug: "lighting", name: "Street Lighting" },
  { slug: "sanitation", name: "Sanitation & Waste" },
  { slug: "water", name: "Water Supply & Drainage" },
  { slug: "electrical", name: "Electrical Safety" },
  { slug: "parks", name: "Parks & Public Spaces" },
] as const;

export const categories = [
  { slug: "pothole", label: "Pothole / bad road", department: "roads", icon: "TriangleAlert" },
  { slug: "streetlight", label: "Broken streetlight", department: "electrical", icon: "Lightbulb" },
  { slug: "garbage", label: "Garbage / dumping", department: "sanitation", icon: "Trash2" },
  { slug: "water_leak", label: "Water leakage", department: "water", icon: "Droplets" },
  { slug: "drainage", label: "Blocked drain / sewage", department: "water", icon: "Waves" },
  { slug: "live_wire", label: "Exposed wire / electrical", department: "electrical", icon: "Zap" },
  { slug: "encroachment", label: "Encroachment / obstruction", department: "parks", icon: "Fence" },
  { slug: "other", label: "Something else", department: "roads", icon: "CircleHelp" },
] as const;

export type CategorySlug = (typeof categories)[number]["slug"];
export type DepartmentSlug = (typeof departments)[number]["slug"];

export const authorityLine = `${authority.authorityName}, ${authority.city}`;
