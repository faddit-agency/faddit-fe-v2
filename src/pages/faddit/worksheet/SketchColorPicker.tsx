import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pipette, Star } from 'lucide-react';

interface HSB {
  h: number;
  s: number;
  b: number;
}

interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

interface Lab {
  l: number;
  a: number;
  b: number;
}

interface PantoneSwatch {
  code: string;
  name: string;
  hex: string;
}

interface PantoneIndexed extends PantoneSwatch {
  token: string;
  searchToken: string;
  lab: Lab;
}

const PANTONE_SWATCHES: PantoneSwatch[] = [
  { code: 'PANTONE 100 C', name: 'Lemon Tint', hex: '#F4ED7C' },
  { code: 'PANTONE 109 C', name: 'Process Yellow', hex: '#FFD100' },
  { code: 'PANTONE 116 C', name: 'School Bus Yellow', hex: '#FFCD00' },
  { code: 'PANTONE 1235 C', name: 'Amber', hex: '#FFB81C' },
  { code: 'PANTONE 1375 C', name: 'Golden Orange', hex: '#FF9E1B' },
  { code: 'PANTONE 1505 C', name: 'Orange Peel', hex: '#FF6900' },
  { code: 'PANTONE 1655 C', name: 'Orange', hex: '#FF5F00' },
  { code: 'PANTONE 172 C', name: 'Warm Red', hex: '#FA4616' },
  { code: 'PANTONE 1788 C', name: 'Bright Red', hex: '#EE2737' },
  { code: 'PANTONE 185 C', name: 'Signal Red', hex: '#E4002B' },
  { code: 'PANTONE 186 C', name: 'Classic Red', hex: '#C8102E' },
  { code: 'PANTONE 200 C', name: 'Dark Red', hex: '#BA0C2F' },
  { code: 'PANTONE 218 C', name: 'Magenta Pink', hex: '#E31C79' },
  { code: 'PANTONE 2597 C', name: 'Vivid Violet', hex: '#7F3F98' },
  { code: 'PANTONE 2685 C', name: 'Deep Purple', hex: '#330072' },
  { code: 'PANTONE 2728 C', name: 'Electric Blue', hex: '#0047BB' },
  { code: 'PANTONE 285 C', name: 'Blue', hex: '#0072CE' },
  { code: 'PANTONE 286 C', name: 'Royal Blue', hex: '#0033A0' },
  { code: 'PANTONE 2935 C', name: 'Strong Blue', hex: '#0057B8' },
  { code: 'PANTONE 2995 C', name: 'Sky Blue', hex: '#00A9E0' },
  { code: 'PANTONE 306 C', name: 'Cyan', hex: '#00B5E2' },
  { code: 'PANTONE 3125 C', name: 'Aqua Blue', hex: '#00B5CC' },
  { code: 'PANTONE 320 C', name: 'Deep Teal', hex: '#008EAA' },
  { code: 'PANTONE 3255 C', name: 'Mint', hex: '#33C7B1' },
  { code: 'PANTONE 3395 C', name: 'Fresh Green', hex: '#00AF66' },
  { code: 'PANTONE 347 C', name: 'Green', hex: '#009A44' },
  { code: 'PANTONE 348 C', name: 'Grass Green', hex: '#00843D' },
  { code: 'PANTONE 355 C', name: 'Kelly Green', hex: '#009639' },
  { code: 'PANTONE 361 C', name: 'Lime Green', hex: '#43B02A' },
  { code: 'PANTONE 368 C', name: 'Bright Lime', hex: '#78BE20' },
  { code: 'PANTONE 376 C', name: 'Acid Green', hex: '#84BD00' },
  { code: 'PANTONE 390 C', name: 'Chartreuse', hex: '#B5BD00' },
  { code: 'PANTONE 4515 C', name: 'Khaki', hex: '#B2A97B' },
  { code: 'PANTONE 4655 C', name: 'Sand', hex: '#C4B083' },
  { code: 'PANTONE 468 C', name: 'Warm Beige', hex: '#DDCBA4' },
  { code: 'PANTONE 4745 C', name: 'Dusty Rose', hex: '#B9978A' },
  { code: 'PANTONE 4975 C', name: 'Brown', hex: '#4F2C1D' },
  { code: 'PANTONE 5503 C', name: 'Soft Gray Blue', hex: '#91A3B0' },
  { code: 'PANTONE 7541 C', name: 'Cool Blue Gray', hex: '#5B6770' },
  { code: 'PANTONE Cool Gray 1 C', name: 'Cool Gray 1', hex: '#D9D9D6' },
  { code: 'PANTONE Cool Gray 3 C', name: 'Cool Gray 3', hex: '#C8C9C7' },
  { code: 'PANTONE Cool Gray 7 C', name: 'Cool Gray 7', hex: '#97999B' },
  { code: 'PANTONE Cool Gray 11 C', name: 'Cool Gray 11', hex: '#53565A' },
  { code: 'PANTONE Black C', name: 'Black', hex: '#2D2926' },
  { code: 'PANTONE Black 6 C', name: 'Rich Black', hex: '#101820' },
  { code: 'PANTONE White', name: 'White', hex: '#FFFFFF' },
  { code: 'PANTONE 11-0601 TCX', name: 'Bright White', hex: '#F4F5F0' },
  { code: 'PANTONE 19-4052 TCX', name: 'Classic Blue', hex: '#0F4C81' },
  { code: 'PANTONE 17-5104 TCX', name: 'Ultimate Gray', hex: '#939597' },
  { code: 'PANTONE 18-1750 TCX', name: 'Viva Magenta', hex: '#BB2649' },
  { code: 'PANTONE 15-1264 TCX', name: 'Peach Fuzz', hex: '#FFBE98' },
];

const STORAGE_KEYS = {
  colorFavorites: 'faddit_sketch_color_favorites_v1',
  colorRecent: 'faddit_sketch_color_recent_v1',
  pantoneFavorites: 'faddit_sketch_pantone_favorites_v1',
  pantoneRecent: 'faddit_sketch_pantone_recent_v1',
} as const;

const MAX_COLOR_ITEMS = 12;
const MAX_PANTONE_ITEMS = 12;
const SIDEPANEL_BUTTON_BASE =
  'rounded-md border border-transparent transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/80 focus-visible:ring-offset-1';
const SIDEPANEL_BUTTON_IDLE = 'cursor-pointer text-gray-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700';
const SIDEPANEL_BUTTON_ACTIVE =
  'border-violet-500 bg-faddit text-white shadow-[0_4px_10px_rgba(118,59,255,0.22)] hover:border-violet-500 hover:bg-violet-600 hover:text-white';
const SIDEPANEL_BUTTON_DISABLED =
  'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-300';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toHexByte = (value: number) => {
  const clamped = clamp(Math.round(value), 0, 255);
  return clamped.toString(16).padStart(2, '0');
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`.toUpperCase();

const normalizePantoneToken = (value: string) =>
  String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const normalizeHexColor = (value: string): string => {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '#000000';
  }

  const shortHex = raw.match(/^#?([0-9a-fA-F]{3})$/);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  const longHex = raw.match(/^#?([0-9a-fA-F]{6})$/);
  if (longHex) {
    return `#${longHex[1]}`.toUpperCase();
  }

  if (typeof document === 'undefined') {
    return '#000000';
  }

  const context = document.createElement('canvas').getContext('2d');
  if (!context) {
    return '#000000';
  }

  context.fillStyle = '#000000';
  context.fillStyle = raw;
  const resolved = context.fillStyle;

  const resolvedHex = resolved.match(/^#([0-9a-fA-F]{6})$/);
  if (resolvedHex) {
    return `#${resolvedHex[1]}`.toUpperCase();
  }

  const rgb = resolved.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i,
  );
  if (rgb) {
    return rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
  }

  return '#000000';
};

const hexToRgb = (hex: string) => {
  const clean = normalizeHexColor(hex).replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
};

const srgbToLinear = (value: number) => {
  const normalized = value / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
};

const rgbToLab = (r: number, g: number, b: number): Lab => {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const x = lr * 0.4124 + lg * 0.3576 + lb * 0.1805;
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  const z = lr * 0.0193 + lg * 0.1192 + lb * 0.9505;

  const xr = x / 0.95047;
  const yr = y / 1.0;
  const zr = z / 1.08883;

  const f = (v: number) => (v > 0.008856 ? v ** (1 / 3) : 7.787 * v + 16 / 116);
  const fx = f(xr);
  const fy = f(yr);
  const fz = f(zr);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
};

const hexToLab = (hex: string) => {
  const rgb = hexToRgb(hex);
  return rgbToLab(rgb.r, rgb.g, rgb.b);
};

const deltaE76 = (left: Lab, right: Lab) => {
  const dl = left.l - right.l;
  const da = left.a - right.a;
  const db = left.b - right.b;
  return Math.sqrt(dl * dl + da * da + db * db);
};

const hexToCmyk = (hex: string): CMYK => {
  const clean = normalizeHexColor(hex).replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const k = 1 - Math.max(r, g, b);
  if (k >= 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);

  return {
    c: Math.round(clamp(c, 0, 1) * 100),
    m: Math.round(clamp(m, 0, 1) * 100),
    y: Math.round(clamp(y, 0, 1) * 100),
    k: Math.round(clamp(k, 0, 1) * 100),
  };
};

const cmykToHex = (c: number, m: number, y: number, k: number): string => {
  const cc = clamp(c, 0, 100) / 100;
  const mm = clamp(m, 0, 100) / 100;
  const yy = clamp(y, 0, 100) / 100;
  const kk = clamp(k, 0, 100) / 100;

  const r = 255 * (1 - cc) * (1 - kk);
  const g = 255 * (1 - mm) * (1 - kk);
  const b = 255 * (1 - yy) * (1 - kk);
  return rgbToHex(r, g, b);
};

const hexToHsb = (hex: string): HSB => {
  const clean = normalizeHexColor(hex).replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const brightness = Math.round(max * 100);

  return { h, s, b: brightness };
};

const hsbToHex = (h: number, s: number, b: number): string => {
  const ss = clamp(s, 0, 100) / 100;
  const bb = clamp(b, 0, 100) / 100;
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => bb * (1 - ss * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const bv = Math.round(f(1) * 255);
  return rgbToHex(r, g, bv);
};

const normalizeColorList = (values: string[]) => {
  const seen = new Set<string>();
  return values
    .map((value) => normalizeHexColor(value))
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    })
    .slice(0, MAX_COLOR_ITEMS);
};

const normalizePantoneList = (values: PantoneSwatch[]) => {
  const seen = new Set<string>();
  return values
    .map((value) => ({
      code: String(value.code ?? '').trim(),
      name: String(value.name ?? '').trim(),
      hex: normalizeHexColor(String(value.hex ?? '#000000')),
    }))
    .filter((value) => {
      const token = normalizePantoneToken(value.code);
      if (!token || seen.has(token)) {
        return false;
      }
      seen.add(token);
      return true;
    })
    .slice(0, MAX_PANTONE_ITEMS);
};

const readStoredList = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const persistStoredList = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore localStorage failures
  }
};

const PANTONE_INDEX: PantoneIndexed[] = PANTONE_SWATCHES.map((swatch) => {
  const hex = normalizeHexColor(swatch.hex);
  return {
    ...swatch,
    hex,
    token: normalizePantoneToken(swatch.code),
    searchToken: normalizePantoneToken(`${swatch.code} ${swatch.name}`),
    lab: hexToLab(hex),
  };
});

const findPantoneByCode = (value: string) => {
  const token = normalizePantoneToken(value);
  if (!token) {
    return null;
  }
  return PANTONE_INDEX.find((swatch) => swatch.token === token || swatch.token.endsWith(token)) ?? null;
};

const findNearestPantone = (hex: string) => {
  const targetLab = hexToLab(hex);
  let nearest = PANTONE_INDEX[0];
  let minDistance = Number.POSITIVE_INFINITY;

  PANTONE_INDEX.forEach((swatch) => {
    const distance = deltaE76(targetLab, swatch.lab);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = swatch;
    }
  });

  return { swatch: nearest, distance: minDistance };
};

const formatRgbLabel = (hex: string) => {
  const rgb = hexToRgb(hex);
  return `RGB ${rgb.r}, ${rgb.g}, ${rgb.b}`;
};

const formatCmykLabel = (hex: string) => {
  const cmyk = hexToCmyk(hex);
  return `CMYK ${cmyk.c}/${cmyk.m}/${cmyk.y}/${cmyk.k}`;
};

interface SketchColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  label: string;
  selectedPantoneCode?: string | null;
  onPantoneCodeChange?: (code: string | null) => void;
}

export default function SketchColorPicker({
  color,
  onChange,
  label,
  selectedPantoneCode,
  onPantoneCodeChange,
}: SketchColorPickerProps) {
  const [hsb, setHsb] = useState<HSB>(() => hexToHsb(color));
  const [hexInput, setHexInput] = useState(() => normalizeHexColor(color));
  const [pantoneQuery, setPantoneQuery] = useState('');
  const [pantoneInputError, setPantoneInputError] = useState('');
  const [eyedropperError, setEyedropperError] = useState('');
  const [activeTab, setActiveTab] = useState<'color' | 'pantone'>('color');
  const [colorFavorites, setColorFavorites] = useState<string[]>(() =>
    normalizeColorList(readStoredList<string[]>(STORAGE_KEYS.colorFavorites, [])),
  );
  const [colorRecent, setColorRecent] = useState<string[]>(() =>
    normalizeColorList(readStoredList<string[]>(STORAGE_KEYS.colorRecent, [])),
  );
  const [pantoneFavorites, setPantoneFavorites] = useState<PantoneSwatch[]>(() =>
    normalizePantoneList(readStoredList<PantoneSwatch[]>(STORAGE_KEYS.pantoneFavorites, [])),
  );
  const [pantoneRecent, setPantoneRecent] = useState<PantoneSwatch[]>(() =>
    normalizePantoneList(readStoredList<PantoneSwatch[]>(STORAGE_KEYS.pantoneRecent, [])),
  );

  const sbRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const draggingSB = useRef(false);
  const draggingHue = useRef(false);

  useEffect(() => {
    persistStoredList(STORAGE_KEYS.colorFavorites, colorFavorites);
  }, [colorFavorites]);

  useEffect(() => {
    persistStoredList(STORAGE_KEYS.colorRecent, colorRecent);
  }, [colorRecent]);

  useEffect(() => {
    persistStoredList(STORAGE_KEYS.pantoneFavorites, pantoneFavorites);
  }, [pantoneFavorites]);

  useEffect(() => {
    persistStoredList(STORAGE_KEYS.pantoneRecent, pantoneRecent);
  }, [pantoneRecent]);

  const pushRecentColor = useCallback((hex: string) => {
    const normalized = normalizeHexColor(hex);
    setColorRecent((prev) => normalizeColorList([normalized, ...prev]));
  }, []);

  const pushRecentPantone = useCallback((swatch: PantoneSwatch) => {
    setPantoneRecent((prev) => normalizePantoneList([swatch, ...prev]));
  }, []);

  const applyHexColor = useCallback(
    (
      rawHex: string,
      options: {
        pantoneCode?: string | null;
        trackRecentColor?: boolean;
        recentPantone?: PantoneSwatch | null;
      } = {},
    ) => {
      const normalized = normalizeHexColor(rawHex);
      const parsed = hexToHsb(normalized);
      setHsb(parsed);
      setHexInput(normalized);
      onChange(normalized);

      if (onPantoneCodeChange) {
        if (Object.prototype.hasOwnProperty.call(options, 'pantoneCode')) {
          onPantoneCodeChange(options.pantoneCode ?? null);
        } else {
          onPantoneCodeChange(null);
        }
      }

      if (options.trackRecentColor) {
        pushRecentColor(normalized);
      }
      if (options.recentPantone) {
        pushRecentPantone(options.recentPantone);
      }
    },
    [onChange, onPantoneCodeChange, pushRecentColor, pushRecentPantone],
  );

  useEffect(() => {
    const normalized = normalizeHexColor(color);
    const parsed = hexToHsb(normalized);
    setHsb(parsed);
    setHexInput(normalized);
    setEyedropperError('');
  }, [color]);

  useEffect(() => {
    if (selectedPantoneCode) {
      setPantoneQuery(selectedPantoneCode);
      return;
    }
    setPantoneQuery('');
  }, [selectedPantoneCode]);

  const emitColor = useCallback(
    (newHsb: HSB) => {
      const hex = hsbToHex(newHsb.h, newHsb.s, newHsb.b);
      applyHexColor(hex);
    },
    [applyHexColor],
  );

  const handleSBMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingSB.current || !sbRef.current) return;
      const rect = sbRef.current.getBoundingClientRect();
      const s = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const b = Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100));
      const newHsb = { ...hsb, s, b };
      setHsb(newHsb);
      emitColor(newHsb);
    },
    [hsb, emitColor],
  );

  const handleHueMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingHue.current || !hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
      const newHsb = { ...hsb, h };
      setHsb(newHsb);
      emitColor(newHsb);
    },
    [hsb, emitColor],
  );

  const stopDrag = useCallback(() => {
    const wasDragging = draggingSB.current || draggingHue.current;
    draggingSB.current = false;
    draggingHue.current = false;
    if (wasDragging) {
      pushRecentColor(hsbToHex(hsb.h, hsb.s, hsb.b));
    }
  }, [hsb, pushRecentColor]);

  useEffect(() => {
    window.addEventListener('mousemove', handleSBMouseMove);
    window.addEventListener('mousemove', handleHueMouseMove);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', handleSBMouseMove);
      window.removeEventListener('mousemove', handleHueMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [handleSBMouseMove, handleHueMouseMove, stopDrag]);

  const handleSBDown = (e: React.MouseEvent) => {
    draggingSB.current = true;
    handleSBMouseMove(e.nativeEvent);
  };

  const handleHueDown = (e: React.MouseEvent) => {
    draggingHue.current = true;
    handleHueMouseMove(e.nativeEvent);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/.test(val)) {
      setPantoneInputError('');
      setEyedropperError('');
      applyHexColor(val, { trackRecentColor: true });
    }
  };

  const currentHex = useMemo(() => hsbToHex(hsb.h, hsb.s, hsb.b), [hsb]);
  const currentCmyk = useMemo(() => hexToCmyk(currentHex), [currentHex]);

  const selectedPantone = useMemo(() => {
    if (!selectedPantoneCode) {
      return null;
    }

    const token = normalizePantoneToken(selectedPantoneCode);
    return (
      PANTONE_INDEX.find((swatch) => swatch.token === token || swatch.token.endsWith(token)) ??
      pantoneFavorites.find((swatch) => normalizePantoneToken(swatch.code) === token) ??
      pantoneRecent.find((swatch) => normalizePantoneToken(swatch.code) === token) ??
      null
    );
  }, [selectedPantoneCode, pantoneFavorites, pantoneRecent]);

  const recommendedPantone = useMemo(() => findNearestPantone(currentHex), [currentHex]);

  const pantoneCandidates = useMemo(() => {
    const token = normalizePantoneToken(pantoneQuery);
    const targetLab = hexToLab(currentHex);

    return PANTONE_INDEX
      .filter((swatch) => {
        if (!token) {
          return true;
        }
        return swatch.searchToken.includes(token) || swatch.token.endsWith(token);
      })
      .map((swatch) => ({
        swatch,
        distance: deltaE76(targetLab, swatch.lab),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 8);
  }, [pantoneQuery, currentHex]);

  const handleCmykChange = (channel: keyof CMYK, rawValue: string) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }

    const next = {
      ...currentCmyk,
      [channel]: clamp(Math.round(parsed), 0, 100),
    };
    setPantoneInputError('');
    applyHexColor(cmykToHex(next.c, next.m, next.y, next.k), { trackRecentColor: true });
  };

  const applyPantone = useCallback(
    (swatch: PantoneSwatch) => {
      setPantoneInputError('');
      setEyedropperError('');
      setPantoneQuery(swatch.code);
      applyHexColor(swatch.hex, {
        pantoneCode: swatch.code,
        trackRecentColor: true,
        recentPantone: swatch,
      });
    },
    [applyHexColor],
  );

  const applyPantoneByQuery = useCallback(() => {
    const exact = findPantoneByCode(pantoneQuery);
    if (!exact) {
      setPantoneInputError('일치하는 팬톤 코드를 찾지 못했습니다. 코드 형식을 확인해 주세요.');
      return;
    }
    applyPantone(exact);
  }, [pantoneQuery, applyPantone]);

  const handlePantoneInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyPantoneByQuery();
    }
  };

  const handleEyedropperPick = async () => {
    setEyedropperError('');
    const eyeDropperCtor = (
      window as Window & {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
      }
    ).EyeDropper;

    if (!eyeDropperCtor) {
      setEyedropperError('현재 브라우저에서 스포이드를 지원하지 않습니다.');
      return;
    }

    try {
      const result = await new eyeDropperCtor().open();
      if (!result?.sRGBHex) {
        return;
      }
      setPantoneInputError('');
      applyHexColor(result.sRGBHex, { trackRecentColor: true });
    } catch (error) {
      const domError = error as DOMException;
      if (domError?.name === 'AbortError') {
        return;
      }
      setEyedropperError('스포이드 실행에 실패했습니다.');
    }
  };

  const toggleColorFavorite = () => {
    const normalized = normalizeHexColor(currentHex);
    setColorFavorites((prev) => {
      if (prev.includes(normalized)) {
        return prev.filter((item) => item !== normalized);
      }
      return normalizeColorList([normalized, ...prev]);
    });
  };

  const colorFavoriteSet = useMemo(() => new Set(colorFavorites), [colorFavorites]);
  const isCurrentColorFavorite = colorFavoriteSet.has(normalizeHexColor(currentHex));

  const togglePantoneFavorite = () => {
    const target = selectedPantone ?? recommendedPantone.swatch;
    const token = normalizePantoneToken(target.code);

    setPantoneFavorites((prev) => {
      const exists = prev.some((item) => normalizePantoneToken(item.code) === token);
      if (exists) {
        return prev.filter((item) => normalizePantoneToken(item.code) !== token);
      }
      return normalizePantoneList([target, ...prev]);
    });
  };

  const pantoneFavoriteSet = useMemo(
    () => new Set(pantoneFavorites.map((item) => normalizePantoneToken(item.code))),
    [pantoneFavorites],
  );
  const pantoneFavoriteTargetToken = normalizePantoneToken((selectedPantone ?? recommendedPantone.swatch).code);
  const isPantoneFavorite = pantoneFavoriteSet.has(pantoneFavoriteTargetToken);

  const supportsEyedropper =
    typeof window !== 'undefined' &&
    'EyeDropper' in (window as Window & { EyeDropper?: unknown });

  const sbThumbX = `${hsb.s}%`;
  const sbThumbY = `${100 - hsb.b}%`;
  const hueThumbX = `${(hsb.h / 360) * 100}%`;

  return (
    <div className='flex h-full min-h-0 w-full min-w-0 flex-col gap-2.5 overflow-x-hidden p-2.5'>
      <p className='text-[11px] font-medium text-gray-500'>{label}</p>

      <div className='grid grid-cols-2 items-center rounded-md border border-gray-200 bg-gray-50 p-0.5'>
        <button
          type='button'
          onClick={() => setActiveTab('color')}
          className={`h-7 w-full text-[10px] font-medium ${SIDEPANEL_BUTTON_BASE} ${
            activeTab === 'color' ? SIDEPANEL_BUTTON_ACTIVE : SIDEPANEL_BUTTON_IDLE
          }`}
          title='색상 탭'
          aria-label='색상 탭'
        >
          색상
        </button>
        <button
          type='button'
          onClick={() => setActiveTab('pantone')}
          className={`h-7 w-full text-[10px] font-medium ${SIDEPANEL_BUTTON_BASE} ${
            activeTab === 'pantone' ? SIDEPANEL_BUTTON_ACTIVE : SIDEPANEL_BUTTON_IDLE
          }`}
          title='팬톤 탭'
          aria-label='팬톤 탭'
        >
          팬톤
        </button>
      </div>

      {activeTab === 'color' ? (
        <div className='flex min-h-0 flex-1 flex-col gap-2.5'>
          <div
            ref={sbRef}
            className='relative h-32 w-full cursor-crosshair rounded-md'
            style={{
              background: `
                linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,1)),
                linear-gradient(to right, #fff, hsl(${hsb.h}, 100%, 50%))
              `,
            }}
            onMouseDown={handleSBDown}
          >
            <div
              className='pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow'
              style={{ left: sbThumbX, top: sbThumbY }}
            />
          </div>

          <div
            ref={hueRef}
            className='relative h-3 w-full cursor-pointer rounded-full'
            style={{
              background:
                'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            }}
            onMouseDown={handleHueDown}
          >
            <div
              className='pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow'
              style={{ left: hueThumbX }}
            />
          </div>

          <div className='flex min-w-0 items-center gap-2'>
            <div className='h-6 w-6 shrink-0 rounded border border-gray-200' style={{ background: currentHex }} />
            <input
              type='text'
              value={hexInput}
              onChange={handleHexChange}
              className='min-w-0 flex-1 rounded border border-gray-200 px-2 py-0.5 font-mono text-xs uppercase focus:ring-1 focus:ring-gray-400 focus:outline-none'
              maxLength={7}
              spellCheck={false}
            />
            <button
              type='button'
              onClick={toggleColorFavorite}
              title={isCurrentColorFavorite ? '색상 즐겨찾기 해제' : '색상 즐겨찾기'}
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center ${SIDEPANEL_BUTTON_BASE} ${
                isCurrentColorFavorite
                  ? 'border-amber-300 bg-amber-50 text-amber-600'
                  : SIDEPANEL_BUTTON_IDLE
              }`}
            >
              <Star size={13} fill={isCurrentColorFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              type='button'
              onClick={() => void handleEyedropperPick()}
              disabled={!supportsEyedropper}
              title={supportsEyedropper ? '스포이드' : '스포이드 미지원 브라우저'}
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center ${SIDEPANEL_BUTTON_BASE} ${
                supportsEyedropper ? SIDEPANEL_BUTTON_IDLE : SIDEPANEL_BUTTON_DISABLED
              }`}
            >
              <Pipette size={13} />
            </button>
          </div>

          <div className='rounded-md border border-gray-200/90 bg-gray-50/70 p-2'>
            <div className='mb-1 flex items-center justify-between'>
              <p className='text-[10px] font-semibold tracking-wide text-gray-500'>CMYK</p>
              <span className='text-[10px] text-gray-400'>%</span>
            </div>
            <div className='grid grid-cols-4 gap-1.5'>
              {(['c', 'm', 'y', 'k'] as (keyof CMYK)[]).map((channel) => (
                <label key={channel} className='flex min-w-0 flex-col gap-1'>
                  <span className='text-[10px] font-medium uppercase text-gray-500'>{channel}</span>
                  <input
                    type='number'
                    min={0}
                    max={100}
                    step={1}
                    value={currentCmyk[channel]}
                    onChange={(event) => handleCmykChange(channel, event.target.value)}
                    className='h-6 w-full rounded border border-gray-200 bg-white px-1.5 text-[11px] text-gray-700 outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-300'
                  />
                </label>
              ))}
            </div>
          </div>

          <div className='flex min-h-0 flex-1 flex-col rounded-md border border-gray-200/90 bg-gray-50/70 p-2'>
            <p className='mb-1 text-[10px] font-semibold tracking-wide text-gray-500'>색상 히스토리</p>
            <div className='flex min-h-0 flex-1 flex-col gap-2'>
              <div className='flex min-h-0 flex-1 flex-col'>
                <p className='mb-1 text-[10px] font-medium text-gray-500'>즐겨찾는 색상</p>
                <div className='min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5'>
                  {colorFavorites.length > 0 ? (
                    colorFavorites.map((hex) => (
                      <button
                        key={`fav-${hex}`}
                        type='button'
                        onClick={() => applyHexColor(hex, { trackRecentColor: true })}
                        className={`flex w-full min-w-0 items-center gap-2 bg-white px-2 py-1 text-left ${SIDEPANEL_BUTTON_BASE} ${SIDEPANEL_BUTTON_IDLE}`}
                        title={`${hex} 적용`}
                        aria-label={`${hex} 적용`}
                      >
                        <span
                          className='h-4 w-4 shrink-0 rounded border border-gray-200'
                          style={{ background: hex }}
                        />
                        <span className='min-w-0 text-[10px] text-gray-600'>
                          <span className='block truncate font-mono text-gray-700'>{hex}</span>
                          <span className='block truncate'>{formatRgbLabel(hex)}</span>
                          <span className='block truncate'>{formatCmykLabel(hex)}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className='rounded border border-dashed border-gray-200 bg-white px-2 py-2 text-[10px] text-gray-500'>
                      저장된 즐겨찾기 색상이 없습니다.
                    </p>
                  )}
                </div>
              </div>

              <div className='flex min-h-0 flex-1 flex-col'>
                <p className='mb-1 text-[10px] font-medium text-gray-500'>최근 사용 색상</p>
                <div className='min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5'>
                  {colorRecent.length > 0 ? (
                    colorRecent.map((hex) => (
                      <button
                        key={`recent-${hex}`}
                        type='button'
                        onClick={() => applyHexColor(hex, { trackRecentColor: true })}
                        className={`flex w-full min-w-0 items-center gap-2 bg-white px-2 py-1 text-left ${SIDEPANEL_BUTTON_BASE} ${SIDEPANEL_BUTTON_IDLE}`}
                        title={`${hex} 적용`}
                        aria-label={`${hex} 적용`}
                      >
                        <span
                          className='h-4 w-4 shrink-0 rounded border border-gray-200'
                          style={{ background: hex }}
                        />
                        <span className='min-w-0 text-[10px] text-gray-600'>
                          <span className='block truncate font-mono text-gray-700'>{hex}</span>
                          <span className='block truncate'>{formatRgbLabel(hex)}</span>
                          <span className='block truncate'>{formatCmykLabel(hex)}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className='rounded border border-dashed border-gray-200 bg-white px-2 py-2 text-[10px] text-gray-500'>
                      최근 사용 색상이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {eyedropperError ? <p className='text-[10px] text-red-500'>{eyedropperError}</p> : null}
        </div>
      ) : (
        <div className='flex min-h-0 flex-1 flex-col gap-2.5'>
          <div className='rounded-md border border-gray-200/90 bg-gray-50/70 p-2'>
            <p className='mb-1 text-[10px] font-semibold tracking-wide text-gray-500'>현재 색상</p>
            <div className='flex min-w-0 items-center gap-2'>
              <span className='inline-block h-5 w-5 shrink-0 rounded border border-gray-200' style={{ background: currentHex }} />
              <div className='min-w-0 text-[10px] text-gray-600'>
                <p className='truncate font-mono text-gray-700'>{currentHex}</p>
                <p className='truncate'>{formatRgbLabel(currentHex)}</p>
                <p className='truncate'>{formatCmykLabel(currentHex)}</p>
              </div>
            </div>
          </div>

          <div className='rounded-md border border-gray-200/90 bg-gray-50/70 p-2'>
            <div className='mb-1 flex items-center justify-between'>
              <label className='text-[10px] font-semibold tracking-wide text-gray-500'>팬톤 코드 검색</label>
              <button
                type='button'
                onClick={togglePantoneFavorite}
                title={isPantoneFavorite ? '팬톤 즐겨찾기 해제' : '팬톤 즐겨찾기'}
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center ${SIDEPANEL_BUTTON_BASE} ${
                  isPantoneFavorite
                    ? 'border-amber-300 bg-amber-50 text-amber-600'
                    : `bg-white ${SIDEPANEL_BUTTON_IDLE}`
                }`}
              >
                <Star size={13} fill={isPantoneFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className='flex min-w-0 items-center gap-1.5'>
              <input
                type='text'
                value={pantoneQuery}
                onChange={(event) => {
                  setPantoneQuery(event.target.value);
                  setPantoneInputError('');
                }}
                onKeyDown={handlePantoneInputKeyDown}
                placeholder='예: 186 C, 19-4052 TCX'
                className='min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 text-[11px] text-gray-700 outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-300'
              />
              <button
                type='button'
                onClick={applyPantoneByQuery}
                className={`h-7 shrink-0 bg-white px-2 text-[11px] font-medium ${SIDEPANEL_BUTTON_BASE} ${SIDEPANEL_BUTTON_IDLE}`}
                title='팬톤 적용'
                aria-label='팬톤 적용'
              >
                적용
              </button>
            </div>

            <div className='mt-1.5 rounded border border-gray-200 bg-white p-1.5'>
              <div className='mb-1 flex items-center justify-between'>
                <p className='text-[10px] font-medium text-gray-500'>현재 색상 최근접 추천</p>
                <button
                  type='button'
                  onClick={() => applyPantone(recommendedPantone.swatch)}
                  className='rounded px-1.5 py-0.5 text-[10px] font-medium text-violet-700 transition-colors hover:bg-violet-50'
                  title='추천 팬톤 적용'
                  aria-label='추천 팬톤 적용'
                >
                  추천 적용
                </button>
              </div>
              <div className='flex min-w-0 items-center gap-2'>
                <span
                  className='inline-block h-4 w-4 shrink-0 rounded border border-gray-200'
                  style={{ background: recommendedPantone.swatch.hex }}
                />
                <div className='min-w-0 text-[10px] text-gray-600'>
                  <p className='truncate font-medium text-gray-700'>{recommendedPantone.swatch.code}</p>
                  <p className='truncate'>{recommendedPantone.swatch.name}</p>
                  <p className='truncate'>
                    {recommendedPantone.swatch.hex} · ΔE {recommendedPantone.distance.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            <div className='mt-1.5 max-h-28 overflow-y-auto overflow-x-hidden rounded border border-gray-200 bg-white'>
              {pantoneCandidates.length > 0 ? (
                pantoneCandidates.map(({ swatch }) => (
                  <button
                    key={swatch.code}
                    type='button'
                    onClick={() => applyPantone(swatch)}
                    className='flex w-full min-w-0 items-center gap-2 border-b border-gray-100 px-2 py-1 text-left last:border-b-0 hover:bg-violet-50'
                    title={`${swatch.code} 적용`}
                    aria-label={`${swatch.code} 적용`}
                  >
                    <span
                      className='inline-block h-3 w-3 shrink-0 rounded border border-gray-200'
                      style={{ background: swatch.hex }}
                    />
                    <span className='min-w-0 text-[10px] text-gray-700'>
                      <span className='block truncate font-medium'>{swatch.code}</span>
                      <span className='block truncate text-gray-500'>{swatch.name}</span>
                    </span>
                  </button>
                ))
              ) : (
                <p className='px-2 py-2 text-[10px] text-gray-500'>검색 결과가 없습니다.</p>
              )}
            </div>

            {selectedPantone ? (
              <div className='mt-1.5 flex min-w-0 items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700'>
                <span
                  className='inline-block h-3 w-3 shrink-0 rounded border border-emerald-200'
                  style={{ background: selectedPantone.hex }}
                />
                <span className='truncate'>{selectedPantone.code}</span>
              </div>
            ) : null}

            {pantoneInputError ? <p className='mt-1 text-[10px] text-red-500'>{pantoneInputError}</p> : null}
          </div>

          <div className='flex min-h-0 flex-1 flex-col rounded-md border border-gray-200/90 bg-gray-50/70 p-2'>
            <p className='mb-1 text-[10px] font-semibold tracking-wide text-gray-500'>팬톤 히스토리</p>
            <div className='grid min-h-0 flex-1 gap-2'>
              <div className='flex min-h-0 flex-col'>
                <p className='mb-1 text-[10px] font-medium text-gray-500'>즐겨찾는 팬톤</p>
                <div className='min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5'>
                  {pantoneFavorites.length > 0 ? (
                    pantoneFavorites.map((swatch) => (
                      <button
                        key={`pantone-fav-${swatch.code}`}
                        type='button'
                        onClick={() => applyPantone(swatch)}
                        className={`flex w-full min-w-0 items-center gap-2 bg-white px-2 py-1 text-left ${SIDEPANEL_BUTTON_BASE} ${SIDEPANEL_BUTTON_IDLE}`}
                        title={`${swatch.code} 적용`}
                        aria-label={`${swatch.code} 적용`}
                      >
                        <span
                          className='inline-block h-3 w-3 shrink-0 rounded border border-gray-200'
                          style={{ background: swatch.hex }}
                        />
                        <span className='min-w-0 text-[10px] text-gray-700'>
                          <span className='block truncate font-medium'>{swatch.code}</span>
                          <span className='block truncate text-gray-500'>{swatch.name}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className='rounded border border-dashed border-gray-200 bg-white px-2 py-2 text-[10px] text-gray-500'>
                      저장된 팬톤 즐겨찾기가 없습니다.
                    </p>
                  )}
                </div>
              </div>
              <div className='flex min-h-0 flex-col'>
                <p className='mb-1 text-[10px] font-medium text-gray-500'>최근 사용 팬톤</p>
                <div className='min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5'>
                  {pantoneRecent.length > 0 ? (
                    pantoneRecent.map((swatch) => (
                      <button
                        key={`pantone-recent-${swatch.code}`}
                        type='button'
                        onClick={() => applyPantone(swatch)}
                        className={`flex w-full min-w-0 items-center gap-2 bg-white px-2 py-1 text-left ${SIDEPANEL_BUTTON_BASE} ${SIDEPANEL_BUTTON_IDLE}`}
                        title={`${swatch.code} 적용`}
                        aria-label={`${swatch.code} 적용`}
                      >
                        <span
                          className='inline-block h-3 w-3 shrink-0 rounded border border-gray-200'
                          style={{ background: swatch.hex }}
                        />
                        <span className='min-w-0 text-[10px] text-gray-700'>
                          <span className='block truncate font-medium'>{swatch.code}</span>
                          <span className='block truncate text-gray-500'>{swatch.name}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className='rounded border border-dashed border-gray-200 bg-white px-2 py-2 text-[10px] text-gray-500'>
                      최근 사용 팬톤이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
