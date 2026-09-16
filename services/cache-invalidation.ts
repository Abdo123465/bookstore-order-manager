let handler: (() => void) | null = null;

export function setInvalidateHandler(fn: () => void) {
  handler = fn;
}

export function triggerInvalidate() {
  handler?.();
}

export function clearInvalidateHandler() {
  handler = null;
}
