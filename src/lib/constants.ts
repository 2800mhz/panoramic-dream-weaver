export const TIME_OF_DAY_OPTIONS = ['Dawn', 'Morning', 'Noon', 'Afternoon', 'Dusk', 'Night'] as const;
export const WEATHER_OPTIONS = ['Clear', 'Cloudy', 'Overcast', 'Foggy', 'Rainy', 'Snowy', 'Stormy', 'Hazy'] as const;
export const SEASON_OPTIONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
export const STYLE_PRESETS = ['Photorealistic', 'Painterly', 'Cinematic', 'Documentary', 'Impressionist'] as const;

export const DEFAULT_BLIND_ZONE = 'Dark interior of a wooden cabin doorway. Camera positioned exactly at the threshold. Natural wood grain visible on door frame edges. No light source inside.';

export const ZONE_NAMES: Record<number, string> = {
  1: '1. Bölge',
  2: '2. Bölge',
  3: '3. Bölge',
  4: 'Uzak Manzara',
};

export const ZONE_DESCRIPTIONS: Record<number, string> = {
  1: 'Ön plan · kamera 1–3m',
  2: 'Orta plan · 3–8m',
  3: 'Arka plan · 8–20m',
  4: 'Uzak manzara · 20m+',
};

export const SLICE_DESCRIPTIONS: Record<number, string> = {
  1: 'Sol üçte bir',
  2: 'Merkez',
  3: 'Sağ üçte bir',
};

export const ZONE_COLORS = {
  1: '#E8842A',
  2: '#1A9FD4',
  3: '#3A5EC8',
  4: '#7A3EC8',
};
