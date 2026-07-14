export type AuthShellScrollRestoreTarget = HTMLElement | null;

const MAX_SCROLL_RESTORE_FRAMES = 60;
const POST_FOCUS_SCROLL_FRAMES = 4;
const SCROLL_LOCK_ATTR = "data-scroll-locked";

function isAuthShellContentVisible(): boolean {
  const email = document.getElementById("auth-shell-email");
  return !!email && email.getClientRects().length > 0;
}

function isReadyToRestoreScroll(): boolean {
  if (isAuthShellContentVisible()) return false;
  if (document.querySelector('[role="dialog"][data-state="open"]')) return false;
  if (document.body.hasAttribute(SCROLL_LOCK_ATTR)) return false;
  return true;
}

function applyScrollPosition(scrollY: number): void {
  window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
  const scrollingElement = document.scrollingElement ?? document.documentElement;
  scrollingElement.scrollTop = scrollY;
}

/**
 * Restores page scroll and trigger focus after the auth shell closes.
 */
export function restoreAuthShellScrollAndFocus(
  scrollY: number,
  trigger: AuthShellScrollRestoreTarget,
): void {
  const applyScroll = () => applyScrollPosition(scrollY);

  const applyFocus = () => {
    if (!trigger?.isConnected) return;
    trigger.focus({ preventScroll: true });
    if (Math.abs(window.scrollY - scrollY) > 1) {
      applyScrollPosition(scrollY);
    }
  };

  let attempts = 0;

  const holdScrollAfterFocus = (framesLeft: number) => {
    applyScroll();
    if (framesLeft <= 1) {
      applyFocus();
      return;
    }
    requestAnimationFrame(() => holdScrollAfterFocus(framesLeft - 1));
  };

  const restoreScrollUntilStable = () => {
    applyScroll();
    if (Math.abs(window.scrollY - scrollY) <= 1 || attempts >= MAX_SCROLL_RESTORE_FRAMES) {
      applyFocus();
      requestAnimationFrame(() => holdScrollAfterFocus(POST_FOCUS_SCROLL_FRAMES));
      return;
    }
    attempts += 1;
    requestAnimationFrame(restoreScrollUntilStable);
  };

  const waitForRestoreReady = () => {
    if (!isReadyToRestoreScroll()) {
      requestAnimationFrame(waitForRestoreReady);
      return;
    }
    attempts = 0;
    requestAnimationFrame(restoreScrollUntilStable);
  };

  requestAnimationFrame(waitForRestoreReady);
}
