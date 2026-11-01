/* TEMPORA — temperature conversion engine
 * Pure calculation and validation utilities shared by the application.
 * No DOM access: this module is intentionally easy to test independently.
 */
(function attachTemporaConverter(root) {
  'use strict';

  const ABSOLUTE_ZERO_C = -273.15;
  const ABSOLUTE_ZERO_F = -459.67;
  const ABSOLUTE_ZERO_K = 0;
  const GAUGE_MAX_C = 1000;
  const NUMERIC_EPSILON = 1e-10;

  const UNITS = Object.freeze({
    C: Object.freeze({ symbol: '°C', name: 'Celsius', label: 'CELSIUS' }),
    F: Object.freeze({ symbol: '°F', name: 'Fahrenheit', label: 'FAHRENHEIT' }),
    K: Object.freeze({ symbol: 'K', name: 'Kelvin', label: 'KELVIN' })
  });

  const ABSOLUTE_ZERO = Object.freeze({
    C: ABSOLUTE_ZERO_C,
    F: ABSOLUTE_ZERO_F,
    K: ABSOLUTE_ZERO_K
  });

  const FORMULAS = Object.freeze({
    'C:F': 'F = (C × 9/5) + 32',
    'C:K': 'K = C + 273.15',
    'F:C': 'C = (F − 32) × 5/9',
    'F:K': 'K = (F − 32) × 5/9 + 273.15',
    'K:C': 'C = K − 273.15',
    'K:F': 'F = (K − 273.15) × 9/5 + 32'
  });

  const PRESETS = Object.freeze([
    Object.freeze({ id: 'freezing', label: 'Freezing', celsius: 0, description: 'Water freezes at standard pressure.' }),
    Object.freeze({ id: 'room', label: 'Room', celsius: 25, description: 'A comfortable indoor reference.' }),
    Object.freeze({ id: 'body', label: 'Body', celsius: 37, description: 'Typical human core temperature reference.' }),
    Object.freeze({ id: 'hot-day', label: 'Hot day', celsius: 40, description: 'A very warm ambient day.' }),
    Object.freeze({ id: 'boiling', label: 'Boiling', celsius: 100, description: 'Water boils at standard atmospheric pressure.' })
  ]);

  function normalizeUnit(unit) {
    if (typeof unit !== 'string') return null;
    const normalized = unit.trim().toUpperCase().replace(/°/g, '');
    if (normalized === 'C' || normalized === 'CELSIUS') return 'C';
    if (normalized === 'F' || normalized === 'FAHRENHEIT') return 'F';
    if (normalized === 'K' || normalized === 'KELVIN') return 'K';
    return null;
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function toCelsius(value, unit) {
    const scale = normalizeUnit(unit);
    if (!isFiniteNumber(value) || !scale) {
      throw new TypeError('A finite temperature and a supported unit (C, F or K) are required.');
    }

    switch (scale) {
      case 'C': return value;
      case 'F': return (value - 32) * (5 / 9);
      case 'K': return value - 273.15;
      default: throw new RangeError('Unsupported temperature unit.');
    }
  }

  function fromCelsius(celsius, unit) {
    const scale = normalizeUnit(unit);
    if (!isFiniteNumber(celsius) || !scale) {
      throw new TypeError('A finite Celsius value and a supported target unit are required.');
    }

    switch (scale) {
      case 'C': return celsius;
      case 'F': return (celsius * (9 / 5)) + 32;
      case 'K': return celsius + 273.15;
      default: throw new RangeError('Unsupported temperature unit.');
    }
  }

  function validateTemperature(value, unit) {
    const scale = normalizeUnit(unit);
    if (!scale) {
      return { valid: false, value: null, unit: null, celsius: null, error: 'Choose Celsius, Fahrenheit or Kelvin.' };
    }

    if (value === '' || value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      return { valid: false, value: null, unit: scale, celsius: null, error: 'Enter a temperature to continue.' };
    }

    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) {
      return { valid: false, value: null, unit: scale, celsius: null, error: 'Enter a valid numeric temperature.' };
    }

    const minimum = ABSOLUTE_ZERO[scale];
    if (numericValue < minimum - NUMERIC_EPSILON) {
      return {
        valid: false,
        value: numericValue,
        unit: scale,
        celsius: null,
        error: `Temperature cannot be below absolute zero (${formatTemperature(minimum, scale, 2)} ${UNITS[scale].symbol}).`
      };
    }

    // Treat microscopic floating-point undershoots as exact absolute zero.
    const safeValue = numericValue < minimum ? minimum : numericValue;
    let celsius;
    try {
      celsius = toCelsius(safeValue, scale);
    } catch (error) {
      return { valid: false, value: safeValue, unit: scale, celsius: null, error: error.message };
    }

    if (celsius < ABSOLUTE_ZERO_C && celsius >= ABSOLUTE_ZERO_C - NUMERIC_EPSILON) {
      celsius = ABSOLUTE_ZERO_C;
    }

    return { valid: true, value: safeValue, unit: scale, celsius, error: '' };
  }

  function convertTemperature(value, fromUnit, toUnit) {
    const source = normalizeUnit(fromUnit);
    const target = normalizeUnit(toUnit);
    if (!source || !target) {
      throw new RangeError('Both source and target units must be C, F or K.');
    }

    const validation = validateTemperature(value, source);
    if (!validation.valid) {
      throw new RangeError(validation.error);
    }

    const result = fromCelsius(validation.celsius, target);
    // Avoid returning a tiny negative Kelvin value from floating-point noise.
    return target === 'K' && result < 0 && result >= -NUMERIC_EPSILON ? 0 : result;
  }

  function convertAll(value, fromUnit) {
    const source = normalizeUnit(fromUnit);
    const validation = validateTemperature(value, source);
    if (!validation.valid) throw new RangeError(validation.error);

    const celsius = validation.celsius;
    return Object.freeze({
      C: celsius,
      F: fromCelsius(celsius, 'F'),
      K: Math.max(0, fromCelsius(celsius, 'K'))
    });
  }

  function formatTemperature(value, unit, precision) {
    const scale = normalizeUnit(unit);
    if (!scale || !Number.isFinite(Number(value))) return '—';
    const places = Number.isInteger(Number(precision)) ? Math.min(8, Math.max(0, Number(precision))) : 2;
    const safeValue = Object.is(Number(value), -0) ? 0 : Number(value);

    try {
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: places,
        maximumFractionDigits: places,
        useGrouping: false
      }).format(safeValue);
    } catch (_) {
      return safeValue.toFixed(places);
    }
  }

  function getUnitInfo(unit) {
    const scale = normalizeUnit(unit);
    return scale ? UNITS[scale] : null;
  }

  function getFormula(fromUnit, toUnit) {
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);
    if (!from || !to || from === to) return '';
    return FORMULAS[`${from}:${to}`] || '';
  }

  function getFormulasFrom(unit) {
    const from = normalizeUnit(unit);
    if (!from) return [];
    return ['C', 'F', 'K']
      .filter((to) => to !== from)
      .map((to) => Object.freeze({ from, to, formula: getFormula(from, to) }));
  }

  function getTemperatureProfile(value, unit) {
    const validation = validateTemperature(value, unit);
    if (!validation.valid) {
      return Object.freeze({ regime: 'invalid', label: 'AWAITING INPUT', note: 'Enter a valid temperature to read its thermal character.' });
    }

    const celsius = validation.celsius;
    if (celsius <= -100) return Object.freeze({ regime: 'cryogenic', label: 'CRYOGENIC', note: 'Matter approaches the limits of thermal motion.' });
    if (celsius <= 0) return Object.freeze({ regime: 'freezing', label: 'FREEZING', note: 'At or below the freezing point of water.' });
    if (celsius < 15) return Object.freeze({ regime: 'cold', label: 'COLD', note: 'A distinctly cool environment.' });
    if (celsius <= 30) return Object.freeze({ regime: 'moderate', label: 'MODERATE', note: 'A comfortable, room-like temperature.' });
    if (celsius <= 45) return Object.freeze({ regime: 'warm', label: 'WARM', note: 'A noticeably warm thermal reading.' });
    if (celsius < 100) return Object.freeze({ regime: 'hot', label: 'HOT', note: 'A high temperature; use appropriate caution.' });
    if (celsius < 500) return Object.freeze({ regime: 'extreme', label: 'EXTREME HEAT', note: 'Far beyond ordinary environmental temperatures.' });
    return Object.freeze({ regime: 'intense', label: 'INTENSE HEAT', note: 'An exceptionally high thermal reading.' });
  }

  function getGaugePercentage(value, unit) {
    const validation = validateTemperature(value, unit);
    if (!validation.valid) return 0;
    const range = GAUGE_MAX_C - ABSOLUTE_ZERO_C;
    return Math.min(100, Math.max(0, ((validation.celsius - ABSOLUTE_ZERO_C) / range) * 100));
  }

  function getSliderBounds(unit) {
    const scale = normalizeUnit(unit);
    if (!scale) throw new RangeError('Choose Celsius, Fahrenheit or Kelvin for the slider.');
    return Object.freeze({
      min: fromCelsius(ABSOLUTE_ZERO_C, scale),
      max: fromCelsius(GAUGE_MAX_C, scale),
      step: scale === 'K' ? 0.01 : 0.01
    });
  }

  function getPresets() {
    return PRESETS;
  }

  const api = Object.freeze({
    ABSOLUTE_ZERO,
    ABSOLUTE_ZERO_C,
    GAUGE_MAX_C,
    UNITS,
    convertAll,
    convertTemperature,
    formatTemperature,
    fromCelsius,
    getFormula,
    getFormulasFrom,
    getGaugePercentage,
    getPresets,
    getSliderBounds,
    getTemperatureProfile,
    getUnitInfo,
    normalizeUnit,
    toCelsius,
    validateTemperature
  });

  root.TemporaConverter = api;
})(typeof window !== 'undefined' ? window : globalThis);
