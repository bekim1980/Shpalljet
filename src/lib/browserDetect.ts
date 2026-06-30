export type BrowserId =
  | "ios-safari"
  | "ios-chrome"
  | "ios-other"
  | "android-chrome"
  | "android-samsung"
  | "android-firefox"
  | "android-edge"
  | "android-opera"
  | "android-other"
  | "desktop-chrome"
  | "desktop-edge"
  | "desktop-other";

export interface BrowserInfo {
  id: BrowserId;
  label: string;
  isMobile: boolean;
  isIos: boolean;
  isAndroid: boolean;
  supportsNativePrompt: boolean;
}

export function detectBrowser(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): BrowserInfo {
  const u = ua.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(u);
  const isAndroid = /android/.test(u);
  const isMobile = isIos || isAndroid || /mobi/.test(u);

  let id: BrowserId = "desktop-other";
  let label = "Browser";

  if (isIos) {
    if (/crios/.test(u)) { id = "ios-chrome"; label = "Chrome (iOS)"; }
    else if (/safari/.test(u) && !/crios|fxios|edgios|opios/.test(u)) { id = "ios-safari"; label = "Safari"; }
    else { id = "ios-other"; label = "iOS Browser"; }
  } else if (isAndroid) {
    if (/samsungbrowser/.test(u)) { id = "android-samsung"; label = "Samsung Internet"; }
    else if (/edga|edg\//.test(u)) { id = "android-edge"; label = "Edge"; }
    else if (/firefox|fxios/.test(u)) { id = "android-firefox"; label = "Firefox"; }
    else if (/opr|opera/.test(u)) { id = "android-opera"; label = "Opera"; }
    else if (/chrome/.test(u)) { id = "android-chrome"; label = "Chrome"; }
    else { id = "android-other"; label = "Android Browser"; }
  } else {
    if (/edg\//.test(u)) { id = "desktop-edge"; label = "Edge"; }
    else if (/chrome/.test(u)) { id = "desktop-chrome"; label = "Chrome"; }
  }

  const supportsNativePrompt =
    id === "android-chrome" ||
    id === "android-samsung" ||
    id === "android-edge" ||
    id === "android-opera" ||
    id === "desktop-chrome" ||
    id === "desktop-edge";

  return { id, label, isMobile, isIos, isAndroid, supportsNativePrompt };
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}
