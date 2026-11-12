// Location of a visitor, from the headers Vercel (or Cloudflare) adds to each
// request. The IP address itself is never read or stored.

// ISO 3166-2:NA region codes.
const NA_REGIONS = {
  CA: 'Zambezi', ER: 'Erongo', HA: 'Hardap', KA: '//Karas', KE: 'Kavango East',
  KW: 'Kavango West', KH: 'Khomas', KU: 'Kunene', OD: 'Otjozondjupa', OH: 'Omaheke',
  ON: 'Oshana', OS: 'Omusati', OT: 'Oshikoto', OW: 'Ohangwena',
};

const REGION_NAMES = { NA: NA_REGIONS };

let countryNames;
try {
  countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
  countryNames = null;
}

const clean = (value, max) => {
  if (!value) return undefined;
  let text = String(value);
  try {
    text = decodeURIComponent(text);
  } catch {
    // keep the raw header
  }
  text = text.trim().slice(0, max);
  return text || undefined;
};

export function geoFromHeaders(req) {
  const country = clean(req.get('x-vercel-ip-country') || req.get('cf-ipcountry'), 2)?.toUpperCase();
  // "XX" / "T1" are Cloudflare's unknown / Tor markers.
  if (!country || !/^[A-Z]{2}$/.test(country) || country === 'XX' || country === 'T1') return {};
  return {
    country,
    region: clean(req.get('x-vercel-ip-country-region'), 8)?.toUpperCase(),
    city: clean(req.get('x-vercel-ip-city'), 80),
  };
}

export function countryName(code) {
  if (!code) return 'Unknown';
  try {
    return countryNames?.of(code) || code;
  } catch {
    return code;
  }
}

// "Khomas" for Namibian regions; elsewhere the city, falling back to the code (null if unknown).
export function regionName(country, region, city) {
  return REGION_NAMES[country]?.[region] || city || region || null;
}
