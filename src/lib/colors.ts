type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function mixWithWhite(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const ratio = Math.max(0, Math.min(1, amount));
  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * ratio,
    g: rgb.g + (255 - rgb.g) * ratio,
    b: rgb.b + (255 - rgb.b) * ratio,
  });
}

export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const ratio = Math.max(0, Math.min(1, amount));
  return rgbToHex({
    r: rgb.r * (1 - ratio),
    g: rgb.g * (1 - ratio),
    b: rgb.b * (1 - ratio),
  });
}

export function rgbChannels(hex: string): string | null {
  const rgb = hexToRgb(hex);
  return rgb ? `${rgb.r} ${rgb.g} ${rgb.b}` : null;
}

export function themeVariables(primaryColor: string, accentColor: string): Record<string, string> {
  const brand = hexToRgb(primaryColor) ? primaryColor : "#C4512C";
  const accent = hexToRgb(accentColor) ? accentColor : "#234D3C";
  const brandRgb = rgbChannels(brand);
  const brandBrightRgb = rgbChannels(mixWithWhite(brand, 0.18));
  const brandDarkRgb = rgbChannels(darken(brand, 0.22));
  const brandSoftRgb = rgbChannels(mixWithWhite(brand, 0.82));
  const brandDeepRgb = rgbChannels(darken(brand, 0.72));
  const accentRgb = rgbChannels(accent);
  const accentLightRgb = rgbChannels(mixWithWhite(accent, 0.24));
  const accentBrightRgb = rgbChannels(mixWithWhite(accent, 0.42));
  const accentSoftRgb = rgbChannels(mixWithWhite(accent, 0.82));
  const accentDeepRgb = rgbChannels(darken(accent, 0.7));

  return {
    ...(brandRgb ? { "--site-brand": brand, "--site-brand-rgb": brandRgb } : {}),
    ...(brandBrightRgb ? { "--site-brand-bright-rgb": brandBrightRgb } : {}),
    ...(brandDarkRgb ? { "--site-brand-dark-rgb": brandDarkRgb } : {}),
    ...(brandSoftRgb ? { "--site-brand-soft-rgb": brandSoftRgb } : {}),
    ...(brandDeepRgb ? { "--site-brand-deep-rgb": brandDeepRgb } : {}),
    ...(accentRgb ? { "--site-accent": accent, "--site-accent-rgb": accentRgb } : {}),
    ...(accentLightRgb ? { "--site-accent-light-rgb": accentLightRgb } : {}),
    ...(accentBrightRgb ? { "--site-accent-bright-rgb": accentBrightRgb } : {}),
    ...(accentSoftRgb ? { "--site-accent-soft-rgb": accentSoftRgb } : {}),
    ...(accentDeepRgb ? { "--site-accent-deep-rgb": accentDeepRgb } : {}),
  };
}
