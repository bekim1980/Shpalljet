export type AuthView =
  | "login"
  | "register"
  | "forgot-password"
  | "verify-email"
  | "success";

export type AuthShellVariant = "page" | "modal";

export type OpenAuthShellOptions = {
  returnTo?: string;
  view?: AuthView;
  /** Pre-open scroll position (capture on pointerdown before click side effects). */
  scrollY?: number;
  /** Element to restore focus to on close (e.g. header Login button). */
  trigger?: HTMLElement | null;
};
