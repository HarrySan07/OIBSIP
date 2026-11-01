/* TEMPORA — persistent conversion archive
 * Stores original conversion records and renders them in a progressive calendar:
 * live days -> completed weeks -> completed months -> completed years.
 * Records are never destructively merged; every level is a view over the originals.
 */
(function attachTemporaHistory(root) {
  'use strict';

  const STORAGE_KEY = 'tempora.conversion-history.v1';
  const MAX_RECORDS = 12000;
  const VALID_UNITS = new Set(['C', 'F', 'K']);
  const UNIT_SYMBOLS = Object.freeze({ C: '°C', F: '°F', K: 'K' });
  const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
  const DAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const SHORT_DATE_FORMAT = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

  let records = [];
  let onChange = null;
  let initialized = false;
  let storageAvailable = true;

  const $ = (selector, scope = root.document) => scope.querySelector(selector);

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function startOfWeek(date) {
    const result = startOfDay(date);
    const mondayOffset = (result.getDay() + 6) % 7;
    result.setDate(result.getDate() - mondayOffset);
    return result;
  }

  function endOfWeekExclusive(date) {
    const result = startOfWeek(date);
    result.setDate(result.getDate() + 7);
    return result;
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function isSameDay(left, right) {
    return localDateKey(left) === localDateKey(right);
  }

  function isSameMonth(left, right) {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
  }

  function weekLabel(date) {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const left = SHORT_DATE_FORMAT.format(start);
    const right = SHORT_DATE_FORMAT.format(end);
    return `Week · ${left} — ${right}`;
  }

  function validRecord(candidate) {
    if (!candidate || typeof candidate !== 'object') return false;
    const timestamp = Number(candidate.timestamp);
    const inputValue = Number(candidate.inputValue);
    const celsius = Number(candidate.celsius);
    const fahrenheit = Number(candidate.fahrenheit);
    const kelvin = Number(candidate.kelvin);
    return Number.isFinite(timestamp)
      && Number.isFinite(inputValue)
      && Number.isFinite(celsius)
      && Number.isFinite(fahrenheit)
      && Number.isFinite(kelvin)
      && VALID_UNITS.has(String(candidate.inputUnit || '').toUpperCase())
      && kelvin >= -1e-8
      && timestamp > 0;
  }

  function normalizeRecord(candidate) {
    const precision = Number.isInteger(Number(candidate.precision))
      ? Math.min(8, Math.max(0, Number(candidate.precision)))
      : 2;
    return {
      id: String(candidate.id || createId()),
      timestamp: Number(candidate.timestamp),
      inputValue: Number(candidate.inputValue),
      inputUnit: String(candidate.inputUnit).toUpperCase(),
      celsius: Number(candidate.celsius),
      fahrenheit: Number(candidate.fahrenheit),
      kelvin: Math.max(0, Number(candidate.kelvin)),
      precision,
      source: String(candidate.source || 'input').slice(0, 40)
    };
  }

  function createId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    return `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function load() {
    try {
      const saved = root.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        records = [];
        storageAvailable = true;
        return;
      }
      const parsed = JSON.parse(saved);
      const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.records) ? parsed.records : []);
      records = list.filter(validRecord).map(normalizeRecord).slice(-MAX_RECORDS);
      storageAvailable = true;
    } catch (error) {
      records = [];
      storageAvailable = false;
      console.warn('[TEMPORA] History storage could not be read.', error);
    }
  }

  function persist() {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      storageAvailable = true;
      return true;
    } catch (error) {
      storageAvailable = false;
      console.warn('[TEMPORA] History storage could not be saved.', error);
      return false;
    }
  }

  function notify() {
    if (typeof onChange === 'function') onChange(getRecords());
  }

  function getRecords() {
    return records.map((record) => ({ ...record })).sort((a, b) => b.timestamp - a.timestamp);
  }

  function add(candidate) {
    if (!validRecord(candidate)) {
      console.warn('[TEMPORA] An invalid conversion was not added to history.');
      return false;
    }
    const record = normalizeRecord(candidate);
    if (records.some((item) => item.id === record.id)) record.id = createId();
    records.push(record);
    if (records.length > MAX_RECORDS) records.splice(0, records.length - MAX_RECORDS);
    const saved = persist();
    notify();
    return saved;
  }

  function clear() {
    records = [];
    persist();
    notify();
  }

  function formatValue(value, precision) {
    const safe = Object.is(value, -0) ? 0 : value;
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
      useGrouping: false
    }).format(safe);
  }

  function conversionText(record) {
    const from = `${formatValue(record.inputValue, record.precision)} ${UNIT_SYMBOLS[record.inputUnit]}`;
    const outputs = ['C', 'F', 'K']
      .filter((unit) => unit !== record.inputUnit)
      .map((unit) => `${formatValue(record[unit === 'C' ? 'celsius' : unit === 'F' ? 'fahrenheit' : 'kelvin'], record.precision)} ${UNIT_SYMBOLS[unit]}`);
    return `${from}  →  ${outputs.join('  ·  ')}`;
  }

  function createRecordNode(record) {
    const article = root.document.createElement('article');
    article.className = 'history-record';
    article.dataset.recordId = record.id;

    const date = root.document.createElement('time');
    date.className = 'history-record__date';
    date.dateTime = new Date(record.timestamp).toISOString();
    date.textContent = `${TIME_FORMAT.format(new Date(record.timestamp))} · ${record.source}`;

    const conversion = root.document.createElement('p');
    conversion.className = 'history-record__conversion';
    conversion.textContent = conversionText(record);

    const actions = root.document.createElement('div');
    actions.className = 'history-record__actions';
    const copy = root.document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy';
    copy.setAttribute('aria-label', `Copy conversion ${conversion.textContent}`);
    copy.addEventListener('click', () => copyRecord(record));
    actions.append(copy);

    article.append(date, conversion, actions);
    return article;
  }

  async function copyRecord(record) {
    const text = conversionText(record);
    try {
      if (root.navigator.clipboard && root.isSecureContext) {
        await root.navigator.clipboard.writeText(text);
      } else {
        const field = root.document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        root.document.body.append(field);
        field.select();
        const copied = root.document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Clipboard copy was not permitted.');
      }
      announce('Conversion copied to clipboard.');
    } catch (error) {
      console.warn('[TEMPORA] History copy failed.', error);
      announce('Could not copy this conversion.', 'warning');
    }
  }

  function announce(message, kind = 'success') {
    const region = $('#toast-region');
    if (!region) return;
    const toast = root.document.createElement('div');
    toast.className = `toast toast--${kind}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    region.replaceChildren(toast);
    root.setTimeout(() => {
      toast.classList.add('is-leaving');
      root.setTimeout(() => toast.remove(), 250);
    }, 2300);
  }

  function createGroup(title, count, options = {}) {
    const details = root.document.createElement('details');
    details.className = `history-group${options.nested ? ' history-group--nested' : ''}`;
    if (options.open) details.open = true;

    const summary = root.document.createElement('summary');
    summary.className = 'history-group__summary';
    const heading = root.document.createElement('span');
    heading.className = 'history-group__title';
    heading.textContent = title;
    const meta = root.document.createElement('span');
    meta.className = 'history-group__meta';
    meta.textContent = `${count} ${count === 1 ? 'conversion' : 'conversions'}`;
    summary.append(heading, meta);

    const content = root.document.createElement('div');
    content.className = options.nested ? 'history-group__content history-nested' : 'history-group__content';
    details.append(summary, content);
    return { details, content };
  }

  function appendDayGroup(container, dayRecords, date, options = {}) {
    const dayTitle = isSameDay(date, new Date()) ? 'Today' : DAY_FORMAT.format(date);
    const group = createGroup(dayTitle, dayRecords.length, { open: Boolean(options.open), nested: options.nested });
    dayRecords
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach((record) => group.content.append(createRecordNode(record)));
    container.append(group.details);
  }

  function groupBy(recordsToGroup, keyFn) {
    const groups = new Map();
    recordsToGroup.forEach((record) => {
      const date = new Date(record.timestamp);
      const key = keyFn(date);
      if (!groups.has(key)) groups.set(key, { date, records: [] });
      groups.get(key).records.push(record);
    });
    return Array.from(groups.values()).sort((a, b) => b.date - a.date);
  }

  function renderDays(container, subset, options = {}) {
    const days = groupBy(subset, localDateKey);
    days.forEach((day, index) => {
      appendDayGroup(container, day.records, day.date, {
        open: options.openFirst && index === 0,
        nested: options.nested
      });
    });
  }

  function renderWeek(container, week, options = {}) {
    const weekRecords = week.records;
    const group = createGroup(weekLabel(week.date), weekRecords.length, {
      open: Boolean(options.open),
      nested: options.nested
    });
    renderDays(group.content, weekRecords, { openFirst: options.openDays !== false, nested: true });
    container.append(group.details);
  }

  function renderMonth(container, month, options = {}) {
    const monthRecords = month.records;
    const group = createGroup(MONTH_FORMAT.format(month.date), monthRecords.length, {
      open: Boolean(options.open),
      nested: options.nested
    });
    const weeks = groupBy(monthRecords, (date) => localDateKey(startOfWeek(date)));
    weeks.forEach((week, index) => {
      const weekIsCurrent = localDateKey(week.date) === localDateKey(startOfWeek(new Date()));
      const completed = endOfWeekExclusive(week.date) <= startOfDay(new Date());
      // Finished weeks are compact weekly archive entries. The unfinished week stays day-wise.
      renderWeek(group.content, week, {
        open: !completed && weekIsCurrent,
        openDays: !completed && weekIsCurrent,
        nested: true
      });
    });
    container.append(group.details);
  }

  function renderYear(container, year, options = {}) {
    const group = createGroup(String(year.date.getFullYear()), year.records.length, {
      open: Boolean(options.open),
      nested: options.nested
    });
    const months = groupBy(year.records, monthKey);
    months.forEach((month) => {
      const monthIsCurrent = isSameMonth(month.date, new Date());
      renderMonth(group.content, month, { open: monthIsCurrent, nested: true });
    });
    container.append(group.details);
  }

  function filteredRecords(period, now) {
    const todayStart = startOfDay(now).getTime();
    const weekStart = startOfWeek(now).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
    const all = getRecords();
    switch (period) {
      case 'today': return all.filter((record) => record.timestamp >= todayStart && record.timestamp < todayStart + 86400000);
      case 'week': return all.filter((record) => record.timestamp >= weekStart && record.timestamp < endOfWeekExclusive(now).getTime());
      case 'month': return all.filter((record) => record.timestamp >= monthStart && record.timestamp < new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime());
      case 'year': return all.filter((record) => record.timestamp >= yearStart && record.timestamp < new Date(now.getFullYear() + 1, 0, 1).getTime());
      case 'all':
      default: return all;
    }
  }

  function render(period = 'today') {
    const target = $('#history-tree');
    const total = $('#history-total');
    if (!target) return;

    const validPeriod = ['today', 'week', 'month', 'year', 'all'].includes(period) ? period : 'today';
    const now = new Date();
    const subset = filteredRecords(validPeriod, now);
    if (total) {
      const allCount = records.length;
      const currentCount = subset.length;
      const label = validPeriod === 'today' ? 'today' : validPeriod === 'all' ? 'in total' : `in ${validPeriod === 'week' ? 'this week' : validPeriod === 'month' ? 'this month' : 'this year'}`;
      total.textContent = `${currentCount} ${currentCount === 1 ? 'conversion' : 'conversions'} ${label} · ${allCount} overall`;
      if (!storageAvailable) total.textContent += ' · storage unavailable';
    }

    target.replaceChildren();
    if (!subset.length) {
      const empty = root.document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = validPeriod === 'today'
        ? 'No conversions recorded today. Your next measurement will appear here.'
        : 'No conversions have been recorded in this period.';
      target.append(empty);
      return;
    }

    if (validPeriod === 'today') {
      appendDayGroup(target, subset, now, { open: true });
      return;
    }

    if (validPeriod === 'week') {
      renderDays(target, subset, { openFirst: true });
      return;
    }

    if (validPeriod === 'month') {
      const weeks = groupBy(subset, (date) => localDateKey(startOfWeek(date)));
      weeks.forEach((week) => {
        const activeWeek = localDateKey(week.date) === localDateKey(startOfWeek(now));
        renderWeek(target, week, { open: activeWeek, openDays: activeWeek });
      });
      return;
    }

    if (validPeriod === 'year') {
      const months = groupBy(subset, monthKey);
      months.forEach((month) => renderMonth(target, month, { open: isSameMonth(month.date, now) }));
      return;
    }

    const years = groupBy(subset, (date) => String(date.getFullYear()));
    years.forEach((year) => {
      const currentYear = year.date.getFullYear() === now.getFullYear();
      renderYear(target, year, { open: currentYear });
    });
  }

  function escapeCSV(value) {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCSV() {
    if (!records.length) {
      announce('There is no history to export.', 'warning');
      return false;
    }
    const header = ['id', 'timestamp', 'local_date', 'local_time', 'input_value', 'input_unit', 'celsius', 'fahrenheit', 'kelvin', 'precision', 'source'];
    const rows = getRecords().map((record) => {
      const date = new Date(record.timestamp);
      return [
        record.id,
        date.toISOString(),
        localDateKey(date),
        TIME_FORMAT.format(date),
        record.inputValue,
        record.inputUnit,
        record.celsius,
        record.fahrenheit,
        record.kelvin,
        record.precision,
        record.source
      ];
    });
    const csv = [header, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = root.URL.createObjectURL(blob);
    const anchor = root.document.createElement('a');
    anchor.href = url;
    anchor.download = `tempora-history-${localDateKey(new Date())}.csv`;
    anchor.hidden = true;
    root.document.body.append(anchor);
    anchor.click();
    anchor.remove();
    root.setTimeout(() => root.URL.revokeObjectURL(url), 1000);
    announce('Conversion history exported.');
    return true;
  }

  function init(options = {}) {
    if (typeof options.onChange === 'function') onChange = options.onChange;
    if (!initialized) {
      load();
      initialized = true;
    }
    return Object.freeze({ destroy });
  }

  function destroy() {
    initialized = false;
    onChange = null;
  }

  const api = Object.freeze({
    add,
    clear,
    destroy,
    exportCSV,
    getRecords,
    init,
    render
  });

  root.TemporaHistory = api;
})(typeof window !== 'undefined' ? window : globalThis);
