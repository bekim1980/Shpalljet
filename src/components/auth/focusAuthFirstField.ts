/** Focus the first enabled text control inside an auth dialog/sheet. */
export function focusAuthFirstField(event: Event): void {
  event.preventDefault();
  requestAnimationFrame(() => {
    const target = event.target;
    const root =
      target instanceof HTMLElement
        ? (target.closest('[role="dialog"]') ?? target)
        : document;

    const first = root.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
    );
    first?.focus();
  });
}
