/* ── Nominatim geocoding utilities ────────────────────────────────────────── */
// Nominatim ToS requires a User-Agent and a max rate of 1 req/s.
// Always debounce calls to geocodeAddress by at least 500 ms.

const USER_AGENT = 'CoachmenDetailing/1.0';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NominatimAddress {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

export interface GeocodeResult {
  id: string;
  displayName: string;
  lat: number;
  lng: number;
  importance: number;
  rawAddress: NominatimAddress;
}

export interface ParsedAddress {
  address1: string;
  city: string;
  state: string;
  zip: string;
}

// ── US state name → abbreviation ──────────────────────────────────────────────

const STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR',
  California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
};

function toStateAbbr(raw: string): string {
  if (raw.length === 2) return raw.toUpperCase();
  return STATE_ABBR[raw] ?? raw.slice(0, 2).toUpperCase();
}

// ── Address parser ─────────────────────────────────────────────────────────────

/**
 * Convert a Nominatim structured address into flat BookingLocation fields.
 * Falls back gracefully when parts are missing.
 */
export function parseToAddress(
  displayName: string,
  raw: NominatimAddress,
): ParsedAddress {
  const streetParts = [raw.house_number, raw.road].filter(Boolean);
  const address1 =
    streetParts.length > 0
      ? streetParts.join(' ')
      : (displayName.split(',')[0]?.trim() ?? '');

  const cityRaw =
    raw.city ?? raw.town ?? raw.village ?? raw.hamlet ?? raw.suburb ?? raw.county ?? '';

  const stateRaw = raw.state ?? '';
  const state = stateRaw ? toStateAbbr(stateRaw) : '';

  const zip = raw.postcode?.replace(/\s/g, '').slice(0, 5) ?? '';

  return { address1, city: cityRaw, state, zip };
}

// ── Forward geocoding ──────────────────────────────────────────────────────────

/**
 * Search for addresses matching a text query via Nominatim.
 * Returns up to 5 results sorted by relevance (importance desc).
 * Debounce the caller by ≥500 ms to stay within rate limits.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=us`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json();
    const results: GeocodeResult[] = data.map((r) => ({
      id: `nom-${r.place_id as string}`,
      displayName: r.display_name as string,
      lat: parseFloat(r.lat as string),
      lng: parseFloat(r.lon as string),
      importance: parseFloat(r.importance as string) || 0,
      rawAddress: (r.address ?? {}) as NominatimAddress,
    }));

    return results.sort((a, b) => b.importance - a.importance);
  } catch (err) {
    console.error('geocodeAddress failed', err);
    return [];
  }
}

// ── Reverse geocoding ──────────────────────────────────────────────────────────

export interface ReverseGeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
  rawAddress: NominatimAddress;
}

/**
 * Resolve lat/lng coordinates to a street address via Nominatim.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      return {
        displayName: (data.display_name as string) ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
        rawAddress: (data.address ?? {}) as NominatimAddress,
      };
    }
  } catch (err) {
    console.error('reverseGeocode failed', err);
  }
  return {
    displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    lat,
    lng,
    rawAddress: {},
  };
}
