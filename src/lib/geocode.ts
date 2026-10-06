/**
 * Address search + reverse geocoding via OpenStreetMap Nominatim.
 * No API key required. Used so a citizen can either drop a GPS pin or type an
 * address the way they would in a maps app — and so the label we store is the
 * real place name, never a hardcoded city.
 */
import { authority } from "@/config/authority";

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

const BASE = "https://nominatim.openstreetmap.org";

export async function searchPlaces(query: string, limit = 6): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${BASE}/search?format=jsonv2&addressdetails=1&limit=${limit}&countrycodes=in&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return rows.map((r) => ({
    label: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

/** Turn coordinates into a human address. Falls back to plain coordinates. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `${BASE}/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = (await res.json()) as { display_name?: string };
      if (data.display_name) return data.display_name;
    }
  } catch {
    // network failure — fall through to coordinates
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** Default map centre for this deployment, used only before a location is picked. */
export const defaultCentre = { lat: authority.centre.lat, lng: authority.centre.lng, label: authority.city };
