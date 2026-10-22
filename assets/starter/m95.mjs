// Native dialog helpers. Application code owns drafts, validation and saves.
const sessions = new WeakMap();
const openingOrder = [];

export function openDialog(dialog, { initialFocus, returnFocus } = {}) {
  if (!dialog || typeof dialog.showModal !== 'function') {
    throw new TypeError('openDialog expects a native <dialog>.');
  }
  if (dialog.open) return false;
  const document = dialog.ownerDocument;
  const opener = returnFocus ?? document.activeElement;
  const prior = sessions.get(dialog);
  if (prior) {
    dialog.removeEventListener('close', prior.onClose);
    const oldIndex = openingOrder.indexOf(prior);
    if (oldIndex !== -1) openingOrder.splice(oldIndex, 1);
  }
  const session = { dialog, opener, onClose: null };
  session.onClose = () => {
    // A delayed close event must not steal focus from a newly opened session.
    if (dialog.open || sessions.get(dialog) !== session) return;
    dialog.removeEventListener('close', session.onClose);
    sessions.delete(dialog);
    const index = openingOrder.indexOf(session);
    if (index !== -1) openingOrder.splice(index, 1);
    const activeDialog = openingOrder.findLast((entry) => entry.dialog.open)?.dialog;
    const canRestore = opener?.isConnected && !opener.matches?.(':disabled, [inert]')
      && !opener.closest?.('[inert]') && (!activeDialog || activeDialog.contains(opener));
    if (canRestore && opener.getClientRects().length) opener.focus({ preventScroll: true });
  };
  sessions.set(dialog, session);
  dialog.addEventListener('close', session.onClose);
  dialog.returnValue = '';
  try {
    dialog.showModal();
    openingOrder.push(session);
  } catch (error) {
    dialog.removeEventListener('close', session.onClose);
    sessions.delete(dialog);
    throw error;
  }
  const target = typeof initialFocus === 'string' ? dialog.querySelector(initialFocus) : initialFocus;
  if (target && dialog.contains(target) && !target.matches(':disabled, [inert]')) {
    target.focus({ preventScroll: true });
  }
  return true;
}

export function closeDialog(dialog, value = '') {
  if (!dialog || typeof dialog.close !== 'function') {
    throw new TypeError('closeDialog expects a native <dialog>.');
  }
  if (!dialog.open) return false;
  dialog.close(String(value));
  return true;
}
