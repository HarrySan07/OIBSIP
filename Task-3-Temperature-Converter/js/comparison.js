/* TEMPORA — side-by-side temperature comparison
 * Keeps a small, persistent set of temperature snapshots for quick reference.
 * Each row stores its original input and exact converted values; formatting is
 * applied only when rendering the table.
 */
(function attachTemporaComparison(root) {
  'use strict';

  const STORAGE_KEY = 'tempora.comparison.v1';
  const MAX_ENTRIES = 24;
  const VALID_UNITS = new Set(['C', 'F', 'K']);
  const SYMBOLS = Object.freeze({ C: '°C', F: '°F', K: 'K' });
  const UNIT_NAMES = Object.freeze({ C: 'Celsius', F: 'Fahrenheit', K: 'Kelvin' });
  const Converter = root.TemporaConverter;

  let entries = [];
  let onChange = null;
  let initialized = false;
  let storageAvailable = true;

  const $ = (selector, scope = root.document) => scope.querySelector(selector);

  function createId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    return `cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function isValid(candidate) {
    if (!candidate || typeof candidate !== 'object') return false;
    const inputUnit = String(candidate.inputUnit || '').toUpperCase();
    const values = [candidate.inputValue, candidate.celsius, candidate.fahrenheit, candidate.kelvin]
      .map(Number);
    const timestamp = Number(candidate.timestamp || Date.now());
    return VALID_UNITS.has(inputUnit)
      && values.every(Number.isFinite)
      && values[3] >= -1e-8
      && Number.isFinite(timestamp)
      && timestamp > 0;
  }

  function normalize(candidate) {
    return {
      id: String(candidate.id || createId()),
      inputValue: Number(candidate.inputValue),
      inputUnit: String(candidate.inputUnit).toUpperCase(),
      celsius: Number(candidate.celsius),
      fahrenheit: Number(candidate.fahrenheit),
      kelvin: Math.max(0, Number(candidate.kelvin)),
      timestamp: Number(candidate.timestamp || Date.now())
    };
  }

  function load() {
    try {
      const stored = root.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        entries = [];
        storageAvailable = true;
        return;
      }
      const parsed = JSON.parse(stored);
      const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.entries) ? parsed.entries : []);
      entries = list.filter(isValid).map(normalize).slice(-MAX_ENTRIES);
      storageAvailable = true;
    } catch (error) {
      entries = [];
      storageAvailable = false;
      console.warn('[TEMPORA] Comparison entries could not be loaded.', error);
    }
  }

  function persist() {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      storageAvailable = true;
      return true;
    } catch (error) {
      storageAvailable = false;
      console.warn('[TEMPORA] Comparison entries could not be saved.', error);
      return false;
    }
  }

  function getEntries() {
    return entries.map((entry) => ({ ...entry }));
  }

  function notify() {
    if (typeof onChange === 'function') onChange(getEntries());
  }

  function format(value, unit) {
    if (Converter && typeof Converter.formatTemperature === 'function') {
      return Converter.formatTemperature(value, unit, 2);
    }
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false
    }).format(Object.is(value, -0) ? 0 : value);
  }

  function add(candidate) {
    if (!isValid(candidate)) {
      console.warn('[TEMPORA] An invalid temperature was not added to comparison.');
      return false;
    }
    const entry = normalize(candidate);
    if (entries.some((current) => current.id === entry.id)) entry.id = createId();
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
    const saved = persist();
    notify();
    return saved;
  }

  function remove(id) {
    const previousLength = entries.length;
    entries = entries.filter((entry) => entry.id !== String(id));
    if (entries.length === previousLength) return false;
    persist();
    notify();
    return true;
  }

  function makeCell(value, className) {
    const cell = root.document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = value;
    return cell;
  }

  function createRow(entry, index) {
    const row = root.document.createElement('tr');
    row.dataset.comparisonId = entry.id;

    row.append(
      makeCell(String(index + 1)),
      makeCell(`${format(entry.inputValue, entry.inputUnit)} ${SYMBOLS[entry.inputUnit]}`),
      makeCell(UNIT_NAMES[entry.inputUnit]),
      makeCell(`${format(entry.celsius, 'C')} °C`),
      makeCell(`${format(entry.fahrenheit, 'F')} °F`),
      makeCell(`${format(entry.kelvin, 'K')} K`)
    );

    const actions = root.document.createElement('td');
    const removeButton = root.document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'table-action';
    removeButton.dataset.removeComparison = entry.id;
    removeButton.textContent = 'Remove';
    removeButton.setAttribute('aria-label', `Remove comparison entry ${index + 1}`);
    actions.append(removeButton);
    row.append(actions);
    row.title = `Added ${new Date(entry.timestamp).toLocaleString()}`;
    return row;
  }

  function render() {
    const body = $('#comparison-body');
    const empty = $('#comparison-empty');
    if (!body || !empty) return;

    const fragment = root.document.createDocumentFragment();
    entries.forEach((entry, index) => fragment.append(createRow(entry, index)));
    body.replaceChildren(fragment);

    const isEmpty = entries.length === 0;
    empty.hidden = !isEmpty;
    const tableScroll = body.closest('.table-scroll');
    if (tableScroll) tableScroll.hidden = isEmpty;
  }

  function bindEvents() {
    const body = $('#comparison-body');
    if (!body || body.dataset.comparisonBound === 'true') return;
    body.dataset.comparisonBound = 'true';
    body.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-comparison]');
      if (!button || !body.contains(button)) return;
      remove(button.dataset.removeComparison);
    });
  }

  function init(options = {}) {
    if (typeof options.onChange === 'function') onChange = options.onChange;
    if (!initialized) {
      load();
      bindEvents();
      initialized = true;
    }
    render();
    return getEntries();
  }

  const api = Object.freeze({
    add,
    getEntries,
    init,
    isStorageAvailable: () => storageAvailable,
    remove,
    render
  });

  root.TemporaComparison = api;
})(typeof window !== 'undefined' ? window : globalThis);
