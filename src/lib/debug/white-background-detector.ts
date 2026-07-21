/**
 * White Background Detector — Web-only debug utility.
 *
 * Scans the DOM for elements with computed white/light background colors
 * and logs them to the console with their CSS path and styles.
 *
 * Usage: import and call detectWhiteBackground() from a useEffect on web.
 */

const WHITE_RGB_VARIANTS = [
  "rgb(255, 255, 255)",
  "rgba(255, 255, 255, 1)",
  "#ffffff",
  "#fff",
  "white",
];

const NEAR_WHITE_THRESHOLD = 240; // RGB values above this are "near white"

function isWhiteOrNearWhite(color: string): boolean {
  const trimmed = color.trim().toLowerCase();

  // Exact white match
  if (WHITE_RGB_VARIANTS.includes(trimmed)) return true;
  if (trimmed === "rgba(0, 0, 0, 0)" || trimmed === "transparent") return false;

  // Parse rgb(255, 255, 255) or rgba(255, 255, 255, 1)
  const rgbMatch = trimmed.match(
    /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
  );
  if (rgbMatch) {
    const [_, r, g, b] = rgbMatch.map(Number);
    return r >= NEAR_WHITE_THRESHOLD && g >= NEAR_WHITE_THRESHOLD && b >= NEAR_WHITE_THRESHOLD;
  }

  // Parse hex #ffffff or #fff (short)
  const hexMatch = trimmed.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hexMatch) {
    const [_, r, g, b] = hexMatch.map((x) => parseInt(x, 16));
    return r >= NEAR_WHITE_THRESHOLD && g >= NEAR_WHITE_THRESHOLD && b >= NEAR_WHITE_THRESHOLD;
  }
  const shortHexMatch = trimmed.match(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (shortHexMatch) {
    const [_, r, g, b] = shortHexMatch.map((x) => parseInt(x + x, 16));
    return r >= NEAR_WHITE_THRESHOLD && g >= NEAR_WHITE_THRESHOLD && b >= NEAR_WHITE_THRESHOLD;
  }

  return false;
}

function getElementSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${current.id}`;
      parts.unshift(selector);
      break;
    }

    const className = Array.from(current.classList)
      .filter((c) => !c.startsWith("css-"))
      .join(".");
    if (className) selector += `.${className}`;

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === current!.tagName,
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(" > ");
}

function getFullCssPath(el: Element): string {
  const path: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body) {
    let tag = current.tagName.toLowerCase();
    if (current.id) tag += `#${current.id}`;
    path.unshift(tag);
    current = current.parentElement;
  }
  path.unshift("body");
  return path.join(" > ");
}

interface WhiteElement {
  selector: string;
  cssPath: string;
  tagName: string;
  classes: string;
  computedBg: string;
  ownBg: string;
  hasOwnBackground: boolean;
  textContent: string;
  rect: { width: number; height: number; top: number; left: number };
}

export function detectWhiteBackground(): {
  found: WhiteElement[];
  bodyBg: string;
  htmlBg: string;
  rootBg: string;
  summary: string;
} {
  const found: WhiteElement[] = [];
  const root = document.getElementById("root");
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
  const rootBg = root ? getComputedStyle(root).backgroundColor : "N/A";

  // Walk the DOM looking for white/near-white backgrounds
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    null,
  );

  let node: Element | null = null;
  while ((node = walker.nextNode() as Element | null)) {
    // Skip scripts, styles, etc.
    const skipTags = new Set([
      "script", "style", "link", "meta", "noscript", "svg", "path",
    ]);
    if (skipTags.has(node.tagName.toLowerCase())) continue;

    // Skip text/icon-only elements (ionicons, text nodes)
    if (node.children.length === 0 && !node.textContent?.trim()) continue;

    const computed = getComputedStyle(node);
    const bgColor = computed.backgroundColor;
    const ownBg = node.getAttribute("style")?.match(/background(?:-color)?\s*:\s*([^;]+)/i)?.[1]?.trim() ?? "";
    const hasOwnBackground = !!ownBg;

    if (bgColor && isWhiteOrNearWhite(bgColor)) {
      // Skip elements that are clearly just text containers
      const isTextContainer =
        node.children.length === 0 &&
        node.textContent &&
        node.textContent.trim().length > 0;

      if (isTextContainer) continue;

      const rect = node.getBoundingClientRect();

      // Skip tiny/empty elements
      if (rect.width < 10 || rect.height < 10) continue;

      found.push({
        selector: getElementSelector(node),
        cssPath: getFullCssPath(node),
        tagName: node.tagName.toLowerCase(),
        classes: Array.from(node.classList).join(" "),
        computedBg: bgColor,
        ownBg,
        hasOwnBackground,
        textContent: (node.textContent ?? "").trim().substring(0, 80),
        rect: {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
        },
      });
    }
  }

  // Build summary
  const summaryLines: string[] = [];
  summaryLines.push(`=== White Background Detector ===`);
  summaryLines.push(`html  bg: ${htmlBg}`);
  summaryLines.push(`body  bg: ${bodyBg}`);
  summaryLines.push(`#root bg: ${rootBg}`);
  summaryLines.push(`White/near-white elements found: ${found.length}`);
  summaryLines.push(``);

  for (const el of found) {
    summaryLines.push(`── ${el.selector}`);
    summaryLines.push(`   Tag: ${el.tagName} | Classes: ${el.classes}`);
    summaryLines.push(`   Computed bg: ${el.computedBg}${el.hasOwnBackground ? ` (own: ${el.ownBg})` : ""}`);
    summaryLines.push(`   Size: ${el.rect.width}x${el.rect.height} at (${el.rect.left}, ${el.rect.top})`);
    if (el.textContent) {
      summaryLines.push(`   Text: "${el.textContent}"`);
    }
    summaryLines.push(`   CSS path: ${el.cssPath}`);
  }

  if (found.length === 0) {
    summaryLines.push(`✅ No white background elements found.`);
  }

  const summary = summaryLines.join("\n");
  console.log(summary);

  return { found, bodyBg, htmlBg, rootBg, summary };
}
