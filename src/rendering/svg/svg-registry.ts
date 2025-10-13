/**
 * SVG Registry for managing and creating SVG elements to embed in formulas
 */

export interface SVGConfig {
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  preserveAspectRatio?: string;
}

// Type for SVG content - can be a string or a function that returns an SVG element
type SVGContent = string | ((config: SVGConfig) => SVGElement);

// Registry to store SVG definitions
const svgRegistry = new Map<string, SVGContent>();

/**
 * Register a predefined SVG icon
 */
export const registerSVG = (name: string, content: SVGContent): void => {
  svgRegistry.set(name, content);
};

/**
 * Create an SVG element from registry or inline definition
 */
export const createSVGElement = (
  nameOrContent: string,
  config: SVGConfig = {}
): SVGElement | HTMLElement => {
  const {
    width = 16,
    height = 16,
    fill = "currentColor",
    stroke = "none",
    strokeWidth = 1,
    className = "formula-svg-icon",
    preserveAspectRatio = "xMidYMid meet",
  } = config;

  // Check if it's a registered icon name
  let svgContent: string | SVGElement;

  if (svgRegistry.has(nameOrContent)) {
    const registered = svgRegistry.get(nameOrContent)!;
    if (typeof registered === "function") {
      svgContent = registered(config);
    } else {
      svgContent = registered;
    }
  } else if (
    nameOrContent.startsWith("<svg") ||
    nameOrContent.startsWith("<?xml")
  ) {
    // It's inline SVG content
    svgContent = nameOrContent;
  } else {
    // Not found in registry and not inline SVG - create error placeholder
    const placeholder = document.createElement("span");
    placeholder.className = "svg-placeholder-error";
    placeholder.textContent = `[${nameOrContent}]`;
    placeholder.style.color = "red";
    placeholder.style.fontSize = "0.8em";
    return placeholder;
  }
  let svgElement: SVGElement;
  if (typeof svgContent === "string") {
    // Create wrapper and set innerHTML directly
    const wrapper = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    wrapper.innerHTML = svgContent;
    svgElement = wrapper;
  } else {
    svgElement = svgContent;
  }
  // Apply configuration
  svgElement.setAttribute("width", width.toString());
  svgElement.setAttribute("height", height.toString());
  svgElement.setAttribute("preserveAspectRatio", preserveAspectRatio);
  if (className) {
    svgElement.classList.add(...className.split(" "));
  }
  return svgElement;
};

/**
 * Register default icons
 */
export const registerDefaultIcons = (): void => {
  // Basic shapes
  registerSVG(
    "circle",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="currentColor" stroke="none" stroke-width="1"/>
    </svg>
  `
  );

  registerSVG(
    "square",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
      <rect x="2" y="2" width="16" height="16" fill="currentColor" stroke="none" stroke-width="1"/>
    </svg>
  `
  );

  registerSVG(
    "triangle",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
      <polygon points="10,2 18,18 2,18" fill="currentColor" stroke="none" stroke-width="1"/>
    </svg>
  `
  );

  registerSVG(
    "star",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
      <polygon points="10,2 12,8 18,8 13,12 15,18 10,14 5,18 7,12 2,8 8,8" fill="currentColor" stroke="none" stroke-width="1">
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          from="0 10 10"
          to="360 10 10"
          dur="3s"
          repeatCount="indefinite"/>
      </polygon>
    </svg>
  `
  );

  // Arrow icons
  registerSVG(
    "arrow",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M5,12 L19,12 M14,7 L19,12 L14,17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
  `
  );

  registerSVG(
    "arrow-right",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
      <path d="M5,10 L15,10 M10,5 L15,10 L10,15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `
  );

  // Vector/Arrow icon with marker
  registerSVG("vector", (config) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.innerHTML = `
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="${config.fill || "currentColor"}"/>
        </marker>
      </defs>
      <line x1="4" y1="12" x2="20" y2="12" stroke="${config.stroke || "currentColor"}" stroke-width="${config.strokeWidth || 2}" marker-end="url(#arrowhead)"/>
    `;
    return svg;
  });

  // Angle icon
  registerSVG(
    "angle",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M4,20 L4,4 L20,20 L4,20" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M7,17 A3,3 0 0,1 7,14 L10,17" fill="none" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  `
  );

  // Coordinate axes
  registerSVG(
    "axes",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M3,12 L21,12 M12,3 L12,21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M19,10 L21,12 L19,14 M10,5 L12,3 L14,5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
  `
  );

  // Info icon
  registerSVG(
    "info",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M12,8 L12,8.5 M12,11 L12,16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `
  );

  // Warning icon
  registerSVG(
    "warning",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12,2 L22,20 L2,20 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M12,9 L12,13 M12,16 L12,16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `
  );

  // Graph/Plot icon
  registerSVG(
    "graph",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M3,20 L21,20 M3,20 L3,3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M6,15 Q10,8 14,10 T21,5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `
  );

  // Custom function icon
  registerSVG(
    "function",
    `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <text x="12" y="16" font-family="serif" font-size="16" font-style="italic" text-anchor="middle" fill="currentColor">f(x)</text>
    </svg>
  `
  );
};

// Initialize default icons
registerDefaultIcons();
