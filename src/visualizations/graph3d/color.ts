// Color utility functions for Plot3D visualizations
// Supports hexcode colors, template colors, and custom color scales

export type ColorScale = string | string[];

export interface ColorTemplate {
  name: string;
  colors: string[];
}

// Built-in Plotly color scales
export const PLOTLY_COLOR_SCALES = [
  "Viridis",
  "Plasma",
  "Inferno",
  "Magma",
  "Cividis",
  "Blues",
  "Greens",
  "Reds",
  "YlOrRd",
  "YlGnBu",
  "RdYlBu",
  "RdYlGn",
  "Spectral",
  "Coolwarm",
  "Rainbow",
  "Portland",
  "Jet",
  "Hot",
  "Blackbody",
  "Earth",
  "Electric",
  "Viridis_r",
  "Plasma_r",
  "Inferno_r",
] as const;

// Template color schemes - common color combinations
export const COLOR_TEMPLATES: Record<string, ColorTemplate> = {
  ocean: {
    name: "Ocean",
    colors: [
      "#003f5c",
      "#2f4b7c",
      "#665191",
      "#a05195",
      "#d45087",
      "#f95d6a",
      "#ff7c43",
      "#ffa600",
    ],
  },
  sunset: {
    name: "Sunset",
    colors: [
      "#fcde9c",
      "#faa476",
      "#f0746e",
      "#e34f6f",
      "#dc3977",
      "#b9257a",
      "#7c1d6f",
      "#4c0c6b",
    ],
  },
  forest: {
    name: "Forest",
    colors: [
      "#004d25",
      "#238b45",
      "#41ab5d",
      "#74c476",
      "#a1d99b",
      "#c7e9c0",
      "#e5f5e0",
      "#f7fcf5",
    ],
  },
  fire: {
    name: "Fire",
    colors: [
      "#67000d",
      "#a50f15",
      "#cb181d",
      "#ef3b2c",
      "#fb6a4a",
      "#fc9272",
      "#fcbba1",
      "#fee0d2",
    ],
  },
  ice: {
    name: "Ice",
    colors: [
      "#08306b",
      "#08519c",
      "#2171b5",
      "#4292c6",
      "#6baed6",
      "#9ecae1",
      "#c6dbef",
      "#deebf7",
    ],
  },
  purple: {
    name: "Purple",
    colors: [
      "#3f007d",
      "#54278f",
      "#6a51a3",
      "#807dba",
      "#9e9ac8",
      "#bcbddc",
      "#dadaeb",
      "#f2f0f7",
    ],
  },
  earth: {
    name: "Earth",
    colors: [
      "#8c510a",
      "#bf812d",
      "#dfc27d",
      "#f6e8c3",
      "#c7eae5",
      "#80cdc1",
      "#35978f",
      "#01665e",
    ],
  },
  neon: {
    name: "Neon",
    colors: [
      "#ff00ff",
      "#ff0080",
      "#ff0040",
      "#ff4000",
      "#ff8000",
      "#ffff00",
      "#80ff00",
      "#00ff00",
    ],
  },
};

// Named colors that can be used as single colors
export const NAMED_COLORS: Record<string, string> = {
  // Basic colors
  red: "#FF0000",
  green: "#00FF00",
  blue: "#0000FF",
  yellow: "#FFFF00",
  orange: "#FFA500",
  purple: "#800080",
  pink: "#FFC0CB",
  cyan: "#00FFFF",
  magenta: "#FF00FF",
  lime: "#00FF00",
  indigo: "#4B0082",
  violet: "#8A2BE2",

  // Darker variants
  darkred: "#8B0000",
  darkgreen: "#006400",
  darkblue: "#00008B",
  darkorange: "#FF8C00",
  darkpurple: "#301934",
  darkgray: "#A9A9A9",

  // Light variants
  lightred: "#FFB6C1",
  lightgreen: "#90EE90",
  lightblue: "#ADD8E6",
  lightyellow: "#FFFFE0",
  lightpink: "#FFB6C1",
  lightgray: "#D3D3D3",

  // Grayscale
  black: "#000000",
  white: "#FFFFFF",
  gray: "#808080",
  grey: "#808080",
  silver: "#C0C0C0",

  // Modern UI colors
  primary: "#3B82F6",
  secondary: "#64748B",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#06B6D4",
};

/**
 * Validates if a string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Converts a named color to hex if it exists
 */
export function getNamedColor(colorName: string): string | null {
  const lowerName = colorName.toLowerCase();
  return NAMED_COLORS[lowerName] || null;
}

/**
 * Creates a custom color scale from an array of colors
 */
export function createCustomColorScale(colors: string[]): string[][] {
  if (colors.length < 2) {
    throw new Error("Custom color scale must have at least 2 colors");
  }

  const step = 1 / (colors.length - 1);
  return colors.map((color, index) => [index * step, color]) as string[][];
}

/**
 * Resolves a color specification to a format Plotly can use
 */
export function resolveColor(
  colorSpec: ColorScale,
  fallbackIndex: number = 0
): any {
  // Handle null/undefined
  if (!colorSpec) {
    return getDefaultColorScale(fallbackIndex);
  }

  // Handle array of colors (custom color scale)
  if (Array.isArray(colorSpec)) {
    if (colorSpec.length === 1) {
      // Single color - resolve it and create a solid colorscale
      const resolvedColor = resolveColor(colorSpec[0]);
      if (typeof resolvedColor === "string") {
        // Create a solid colorscale from the single color
        return [
          [0, resolvedColor],
          [1, resolvedColor],
        ];
      }
      return resolvedColor;
    }
    // Multiple colors - create custom colorscale
    const resolvedColors = colorSpec.map((color) => {
      const resolved = resolveColor(color);
      return typeof resolved === "string" ? resolved : resolved.toString();
    });
    return createCustomColorScale(resolvedColors);
  }

  // Handle string color specification
  if (typeof colorSpec === "string") {
    // Check if it's a built-in Plotly color scale
    if (PLOTLY_COLOR_SCALES.includes(colorSpec as any)) {
      return colorSpec;
    }

    // Check if it's a hex color - create solid colorscale
    if (isValidHexColor(colorSpec)) {
      return [
        [0, colorSpec],
        [1, colorSpec],
      ];
    }

    // Check if it's a named color - create solid colorscale
    const namedColor = getNamedColor(colorSpec);
    if (namedColor) {
      return [
        [0, namedColor],
        [1, namedColor],
      ];
    }

    // Check if it's a color template
    const template = COLOR_TEMPLATES[colorSpec.toLowerCase()];
    if (template) {
      return createCustomColorScale(template.colors);
    }

    // If none of the above, treat as a CSS color name and create solid colorscale
    return [
      [0, colorSpec],
      [1, colorSpec],
    ];
  }

  // Fallback to default
  return getDefaultColorScale(fallbackIndex);
}

/**
 * Gets a default color scale by index
 */
export function getDefaultColorScale(index: number): string {
  const defaultScales = ["Viridis", "Plasma", "Inferno", "Magma", "Cividis"];
  return defaultScales[index % defaultScales.length];
}

/**
 * Gets all available color options for UI selection
 */
export function getAvailableColors(): {
  plotlyScales: readonly string[];
  templates: string[];
  namedColors: string[];
} {
  return {
    plotlyScales: PLOTLY_COLOR_SCALES,
    templates: Object.keys(COLOR_TEMPLATES),
    namedColors: Object.keys(NAMED_COLORS),
  };
}

/**
 * Resolves a line color (simpler than surface colors)
 */
export function resolveLineColor(
  colorSpec: string | undefined,
  fallback: string = "#FF0000"
): string {
  if (!colorSpec) {
    return fallback;
  }

  // Check if it's a hex color
  if (isValidHexColor(colorSpec)) {
    return colorSpec;
  }

  // Check if it's a named color
  const namedColor = getNamedColor(colorSpec);
  if (namedColor) {
    return namedColor;
  }

  // Return as-is (for CSS color names)
  return colorSpec;
}

/**
 * Generate gradient colors between two colors
 */
export function generateGradient(
  startColor: string,
  endColor: string,
  steps: number
): string[] {
  const start = hexToRgb(startColor);
  const end = hexToRgb(endColor);

  if (!start || !end) {
    throw new Error("Invalid hex colors provided for gradient");
  }

  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(start.r + (end.r - start.r) * ratio);
    const g = Math.round(start.g + (end.g - start.g) * ratio);
    const b = Math.round(start.b + (end.b - start.b) * ratio);
    colors.push(rgbToHex(r, g, b));
  }

  return colors;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
