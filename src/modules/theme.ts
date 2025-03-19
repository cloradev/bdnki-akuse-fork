// Define color themes with their values
export const COLOR_THEMES: Record<string, string> = {
  'Minato': '#2563eb',   // Blue
  'Rias': '#dc2626',     // Red
  'Kurumi': '#9333ea',   // Purple
  'Miku': '#10b981',     // Green
  'Sakura': '#ec4899',   // Pink
  'Naruto': '#f59e0b',   // Amber
  'Todoroki': '#0891b2', // Cyan
  'Nezuko': '#be123c'    // Rose
};

// Color theme RGB values for opacity support
export const COLOR_THEMES_RGB: Record<string, string> = {
  'Minato': '37, 99, 235',   // Blue
  'Rias': '220, 38, 38',     // Red
  'Kurumi': '147, 51, 234',  // Purple
  'Miku': '16, 185, 129',    // Green
  'Sakura': '236, 72, 153',  // Pink
  'Naruto': '245, 158, 11',  // Amber
  'Todoroki': '8, 145, 178', // Cyan
  'Nezuko': '190, 18, 60'    // Rose
};

// Define font families that can be used throughout the app
export const FONT_FAMILIES: Record<string, string> = {
  'Poppins': 'Poppins, sans-serif',
  'Inter': 'Inter, sans-serif',
  'Major Mono': 'Major Mono Display, monospace',
  'Zilla Slab': 'Zilla Slab, serif',
  'Space Mono': 'Space Mono, monospace',
  'Chillax': 'Chillax, sans-serif',
  'Cabinet Grotesk': 'Cabinet Grotesk, sans-serif',
  'Satoshi': 'Satoshi, sans-serif',
  'General Sans': 'General Sans, sans-serif',
  'Clash Display': 'Clash Display, sans-serif',
  'Switzer': 'Switzer, sans-serif',
  'Neue Montreal': 'Neue Montreal, sans-serif',
  'Tomato Grotesk': 'Tomato Grotesk, sans-serif',
  'Basement Grotesque': 'Basement Grotesque, sans-serif',
  'Reckless Neue': 'Reckless Neue, serif',
  'Obviously': 'Obviously, sans-serif'
};

// Define background themes with varying darkness levels
export const BACKGROUND_THEMES: Record<string, {
  color0: string,
  color1: string,
  color2: string,
  color3: string,
  color4: string
}> = {
  'Pitch Black': {
    color0: '#000000',
    color1: '#070707',
    color2: '#0d0d0d',
    color3: '#141414',
    color4: '#1a1a1a'
  },
  'Night': {
    color0: '#000000',
    color1: '#0a0a0a',
    color2: '#121212',
    color3: '#1a1a1a',
    color4: '#222222'
  },
  'Darker': {
    color0: '#080a0e',
    color1: '#12151b',
    color2: '#181c23',
    color3: '#1e2229',
    color4: '#242630'
  },
  'Dark': {
    color0: '#0f1115',
    color1: '#1a1d24',
    color2: '#22252e',
    color3: '#2c2e3a',
    color4: '#32333f'
  },
  'Midnight Blue': {
    color0: '#0c1425',
    color1: '#162042',
    color2: '#1e2c54',
    color3: '#283966',
    color4: '#324878'
  },
  'Dim': {
    color0: '#1f2937',
    color1: '#2d3748',
    color2: '#374151',
    color3: '#4b5563',
    color4: '#6b7280'
  },
  'Slate': {
    color0: '#334155',
    color1: '#475569',
    color2: '#64748b',
    color3: '#94a3b8',
    color4: '#cbd5e1'
  },
  'Light': {
    color0: '#e5e7eb',
    color1: '#f3f4f6',
    color2: '#f9fafb',
    color3: '#ffffff',
    color4: '#ffffff'
  }
};

/**
 * Apply a theme color to the document CSS variables
 * @param themeName The name of the theme from COLOR_THEMES
 */
export function applyTheme(themeName: string): void {
  const themeColor = COLOR_THEMES[themeName] || COLOR_THEMES['Minato'];
  const themeColorRGB = COLOR_THEMES_RGB[themeName] || COLOR_THEMES_RGB['Minato'];

  // Main theme variables
  document.documentElement.style.setProperty('--primary', themeColor);
  document.documentElement.style.setProperty('--color-important', themeColor);
  document.documentElement.style.setProperty('--color-important-rgb', themeColorRGB);

  // Secondary variables that might be used in different components
  document.documentElement.style.setProperty('--scrollbar-active', themeColor);
  document.documentElement.style.setProperty('--color-primary', themeColor);
  document.documentElement.style.setProperty('--color-info', themeColor);

  // Any other color variables that should use the primary color
  // Add more as needed if you find components using different variable names
}

/**
 * Apply background theme colors to document CSS variables
 * @param themeName The name of the background theme
 */
export function applyBackgroundTheme(themeName: string): void {
  const theme = BACKGROUND_THEMES[themeName] || BACKGROUND_THEMES['Dark'];

  // Convert hex to RGB for color variables
  const color0RGB = hexToRgb(theme.color0);
  const color1RGB = hexToRgb(theme.color1);
  const color2RGB = hexToRgb(theme.color2);
  const color3RGB = hexToRgb(theme.color3);
  const color4RGB = hexToRgb(theme.color4);

  // Apply background color theme
  document.documentElement.style.setProperty('--color-0', theme.color0);
  document.documentElement.style.setProperty('--color-1', theme.color1);
  document.documentElement.style.setProperty('--color-2', theme.color2);
  document.documentElement.style.setProperty('--color-3', theme.color3);
  document.documentElement.style.setProperty('--color-4', theme.color4);

  // Apply RGB versions for opacity support
  document.documentElement.style.setProperty('--color-0-rgb', color0RGB);
  document.documentElement.style.setProperty('--color-1-rgb', color1RGB);
  document.documentElement.style.setProperty('--color-2-rgb', color2RGB);
  document.documentElement.style.setProperty('--color-3-rgb', color3RGB);
  document.documentElement.style.setProperty('--color-4-rgb', color4RGB);

  // Update font colors based on theme brightness
  const isLightTheme = ['Light', 'Slate'].includes(themeName);

  if (isLightTheme) {
    document.documentElement.style.setProperty('--font-1', '#111827');
    document.documentElement.style.setProperty('--font-2', '#374151');
    document.documentElement.style.setProperty('--font-3', '#6b7280');
  } else {
    document.documentElement.style.setProperty('--font-1', '#f1f2f6');
    document.documentElement.style.setProperty('--font-2', '#bec0cc');
    document.documentElement.style.setProperty('--font-3', '#89919a');
  }
}

/**
 * Converts a hex color to RGB format
 * @param hex The hex color string
 * @returns RGB values as a string "r, g, b"
 */
function hexToRgb(hex: string): string {
  // Remove the hash at the start if it exists
  hex = hex.replace(/^#/, '');

  // Parse the hex values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `${r}, ${g}, ${b}`;
}

/**
 * Apply font family to the document CSS variables
 * @param fontName The name of the font from FONT_FAMILIES
 */
export function applyFontFamily(fontName: string): void {
  const fontFamily = FONT_FAMILIES[fontName] || FONT_FAMILIES['Poppins'];

  console.log(`Applying font family: ${fontName} -> ${fontFamily}`);

  // Set the font family CSS variable
  document.documentElement.style.setProperty('--font-family', fontFamily);

  // Apply it to key elements directly to ensure it takes effect
  document.body.style.fontFamily = fontFamily;

  // Distinctive fonts need more aggressive application
  const distinctiveFonts = [
    'Major Mono', 'Space Mono', 'Clash Display', 'Basement Grotesque',
    'Tomato Grotesk', 'Cabinet Grotesk', 'Reckless Neue', 'Obviously'
  ];

  // Apply more aggressively for distinctive typography
  if (distinctiveFonts.includes(fontName)) {
    // Force a redraw with the new font
    document.body.style.opacity = '0.99';
    setTimeout(() => {
      document.body.style.opacity = '1';
    }, 10);

    // Apply to all elements to ensure proper display
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      if (el instanceof HTMLElement &&
          !(el instanceof HTMLScriptElement) &&
          !(el instanceof HTMLStyleElement)) {
        el.style.fontFamily = fontFamily;

        // Special handling for navigation labels with wider fonts
        if (el.classList.contains('nav-label')) {
          if (['Major Mono', 'Space Mono', 'Basement Grotesque', 'Clash Display'].includes(fontName)) {
            el.style.fontSize = '0.65rem';
            el.style.letterSpacing = '-0.03em';
          }
        }
      }
    });
  }
}

/**
 * Get the color value for a named theme
 * @param themeName The name of the theme
 * @returns The color hex value
 */
export function getThemeColor(themeName: string): string {
  return COLOR_THEMES[themeName] || COLOR_THEMES['Minato'];
}
