export type KeyboardAction = 'prev' | 'next' | 'first' | 'last' | 'flip' | null;

/**
 * Checks whether an event target is an interactive text input where shortcuts should be ignored.
 */
export function isInputFocused(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  return target.isContentEditable;
}

/**
 * Pure evaluation function mapping keyboard events to chess board actions.
 * - Suppressed if input or editable element is focused.
 * - Suppressed if any modal dialog is currently open.
 * - Arrow navigation & Home/End are suppressed during active Drill Mode.
 * - Flip ('f') is permitted in all modes when not focused in input/modal.
 */
export function evaluateKeyboardShortcut(
  key: string,
  isInput: boolean,
  isModalOpen: boolean,
  isDrilling: boolean
): KeyboardAction {
  if (isInput || isModalOpen) {
    return null;
  }

  const normalizedKey = key.toLowerCase();

  // Flip board perspective
  if (normalizedKey === 'f') {
    return 'flip';
  }

  // History navigation shortcuts (only active outside drill mode)
  if (!isDrilling) {
    if (key === 'ArrowLeft') {
      return 'prev';
    }
    if (key === 'ArrowRight') {
      return 'next';
    }
    if (key === 'Home') {
      return 'first';
    }
    if (key === 'End') {
      return 'last';
    }
  }

  return null;
}
