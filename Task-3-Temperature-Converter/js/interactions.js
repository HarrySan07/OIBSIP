/* TEMPORA — global interaction controls
 * Keyboard shortcuts and shared interface actions.
 * Loaded before app.js; callbacks are supplied by TemporaApp during init.
 */
(function attachTemporaInteractions(root) {
  'use strict';

  const SHORTCUTS = Object.freeze({
    s: 'swap',
    r: 'reset',
    h: 'openHistory',
    c: 'copy'
  });

  let callbacks = null;
  let initialized = false;

  function isEditableTarget(target) {
    if (!target || !(target instanceof root.Element)) return false;
    if (target.isContentEditable) return true;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
  }

  function isDialogOpen() {
    const dialog = root.document.getElementById('settings-dialog');
    return Boolean(dialog && dialog.open);
  }

  function runShortcut(action) {
    if (!callbacks || typeof callbacks[action] !== 'function') return false;

    switch (action) {
      case 'swap':
        callbacks.swap();
        return true;
      case 'reset':
        callbacks.reset();
        return true;
      case 'openHistory':
        callbacks.openHistory();
        return true;
      case 'copy':
        callbacks.copy();
        return true;
      default:
        return false;
    }
  }

  function handleKeydown(event) {
    if (!event || event.defaultPrevented || event.isComposing) return;

    if (event.key === 'Escape') {
      if (isDialogOpen() && callbacks && typeof callbacks.close === 'function') {
        event.preventDefault();
        callbacks.close();
      }
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (isEditableTarget(event.target)) return;
    if (isDialogOpen()) return;

    const action = SHORTCUTS[String(event.key || '').toLowerCase()];
    if (!action) return;

    const handled = runShortcut(action);
    if (handled) event.preventDefault();
  }

  function init(nextCallbacks = {}) {
    callbacks = {
      swap: nextCallbacks.swap,
      reset: nextCallbacks.reset,
      openHistory: nextCallbacks.openHistory,
      copy: nextCallbacks.copy,
      close: nextCallbacks.close,
      showToast: nextCallbacks.showToast
    };

    if (!initialized) {
      root.document.addEventListener('keydown', handleKeydown);
      initialized = true;
    }

    return Object.freeze({ destroy });
  }

  function destroy() {
    if (initialized) {
      root.document.removeEventListener('keydown', handleKeydown);
      initialized = false;
    }
    callbacks = null;
  }

  root.TemporaInteractions = Object.freeze({ init, destroy });
})(typeof window !== 'undefined' ? window : globalThis);
