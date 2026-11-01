/* TEMPORA — application orchestrator
 * Connects the conversion engine, interface, history, comparison and sound modules.
 * Loaded after the supporting scripts in index.html.
 */
(function attachTemporaApp(root) {
  "use strict";

  const STORAGE_KEY = "tempora.preferences.v1";
  const DEFAULTS = Object.freeze({
    precision: 2,
    reducedMotion: false,
    soundEnabled: false,
    historyPeriod: "today",
  });

  const Converter = root.TemporaConverter;
  if (!Converter) {
    console.error("[TEMPORA] The conversion engine must load before app.js.");
    return;
  }

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) =>
    Array.from(scope.querySelectorAll(selector));
  const elements = {
    input: $("#temperature-input"),
    unit: $("#input-unit"),
    inputError: $("#input-error"),
    inputHint: $("#input-hint"),
    slider: $("#temperature-slider"),
    sliderOutput: $("#slider-output"),
    sliderMin: $("#slider-min"),
    sliderMax: $("#slider-max"),
    sourceUnitLabel: $("#source-unit-label"),
    swap: $("#swap-units"),
    precision: $("#precision-select"),
    settingPrecision: $("#setting-precision"),
    settingMotion: $("#setting-motion"),
    settingSound: $("#setting-sound"),
    settingsDialog: $("#settings-dialog"),
    settingsOpen: $("#settings-open"),
    soundToggle: $("#sound-toggle"),
    motionToggle: $("#motion-toggle"),
    gauge: $("#temperature-gauge"),
    gaugeProgress: $("#gauge-progress"),
    smokeFill: $("#smoke-fill"),
    smokeClouds: $("#smoke-clouds"),
    smokeWaveBack: $("#smoke-wave-back"),
    smokeWaveFront: $("#smoke-wave-front"),
    gaugeUnit: $("#gauge-unit-label"),
    gaugeTemperature: $("#gauge-temperature"),
    gaugeCondition: $("#gauge-condition"),
    gaugeNote: $("#gauge-note"),
    formulaList: $("#formula-list"),
    presetGrid: $("#preset-grid"),
    copyAll: $("#copy-all-results"),
    comparisonAdd: $("#comparison-add"),
    historyTotal: $("#history-total"),
    historyTree: $("#history-tree"),
    historyExport: $("#history-export"),
    historyClear: $("#history-clear"),
    toastRegion: $("#toast-region"),
    footerYear: $("#footer-year"),
  };

  const state = {
    value: 25,
    unit: "C",
    precision: DEFAULTS.precision,
    validation: null,
    results: null,
    profile: null,
    gaugePercentage: 0,
    historyPeriod: DEFAULTS.historyPeriod,
    preferences: { ...DEFAULTS },
    lastRecordedKey: "",
    toastTimer: null,
  };

  function readPreferences() {
    try {
      const saved = JSON.parse(root.localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        precision: Number.isInteger(Number(saved.precision))
          ? Math.min(6, Math.max(0, Number(saved.precision)))
          : DEFAULTS.precision,
        reducedMotion: Boolean(saved.reducedMotion),
        soundEnabled: Boolean(saved.soundEnabled),
        historyPeriod: ["today", "week", "month", "year", "all"].includes(
          saved.historyPeriod,
        )
          ? saved.historyPeriod
          : DEFAULTS.historyPeriod,
      };
    } catch (error) {
      console.warn(
        "[TEMPORA] Preferences could not be read; defaults will be used.",
        error,
      );
      return { ...DEFAULTS };
    }
  }

  function savePreferences() {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.preferences));
    } catch (error) {
      console.warn("[TEMPORA] Preferences could not be saved.", error);
      showToast("Preferences could not be saved in this browser.", "warning");
    }
  }

  function unitInfo(unit = state.unit) {
    return Converter.getUnitInfo(unit) || Converter.getUnitInfo("C");
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function showToast(message, kind = "info") {
    if (!elements.toastRegion) return;
    if (state.toastTimer) root.clearTimeout(state.toastTimer);
    const toast = document.createElement("div");
    toast.className = `toast toast--${kind}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    elements.toastRegion.replaceChildren(toast);
    state.toastTimer = root.setTimeout(() => {
      toast.classList.add("is-leaving");
      root.setTimeout(() => toast.remove(), 250);
    }, 2600);
  }

  function playSound(name = "click") {
    if (!state.preferences.soundEnabled) return;
    const sound = root.TemporaSound;
    if (sound && typeof sound.play === "function") sound.play(name);
  }

  function recordCurrentConversion(source = "input") {
    if (!state.validation || !state.validation.valid || !state.results) return;
    const key = [
      state.validation.value,
      state.unit,
      state.precision,
      source,
    ].join("|");
    if (key === state.lastRecordedKey) return;
    state.lastRecordedKey = key;

    const history = root.TemporaHistory;
    if (!history || typeof history.add !== "function") return;

    history.add({
      id: createRecordId(),
      timestamp: Date.now(),
      inputValue: state.validation.value,
      inputUnit: state.unit,
      celsius: state.results.C,
      fahrenheit: state.results.F,
      kelvin: state.results.K,
      precision: state.precision,
      source,
    });
    refreshHistory();
  }

  function createRecordId() {
    if (root.crypto && typeof root.crypto.randomUUID === "function")
      return root.crypto.randomUUID();
    return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function setResultCard(card, unit, value) {
    if (!card) return;
    card.dataset.resultCard = unit;
    const info = Converter.getUnitInfo(unit);
    const title = $(".result-card__unit", card);
    const valueElement = $(".result-card__value", card);
    const copyButton = $("[data-copy-result]", card);
    setText(title, info ? info.label : unit);
    if (valueElement) {
      valueElement.replaceChildren(
        document.createTextNode(
          Converter.formatTemperature(value, unit, state.precision) + " ",
        ),
        Object.assign(document.createElement("span"), {
          textContent: info ? info.symbol : unit,
        }),
      );
    }
    if (copyButton) {
      copyButton.dataset.copyResult = unit;
      copyButton.setAttribute(
        "aria-label",
        `Copy ${info ? info.name : unit} result`,
      );
    }
  }

  function renderResults() {
    if (!state.results) return;
    const targets = ["C", "F", "K"].filter((unit) => unit !== state.unit);
    const cards = $$(".result-card", $(".result-grid"));
    targets.forEach((unit, index) =>
      setResultCard(cards[index], unit, state.results[unit]),
    );

    const formulaRows = Converter.getFormulasFrom(state.unit);
    if (elements.formulaList) {
      elements.formulaList.replaceChildren(
        ...formulaRows.map((row) => {
          const paragraph = document.createElement("p");
          paragraph.className = "formula-row";
          const direction = document.createElement("span");
          direction.textContent = `${Converter.getUnitInfo(row.from).symbol} → ${Converter.getUnitInfo(row.to).symbol}`;
          const code = document.createElement("code");
          code.textContent = row.formula;
          paragraph.append(direction, code);
          return paragraph;
        }),
      );
    }

    if (elements.sourceUnitLabel) {
      const info = unitInfo();
      elements.sourceUnitLabel.textContent = `${info.label} / ${info.symbol}`;
    }
  }

  function renderGauge() {
    const validation = state.validation;
    if (!validation || !validation.valid) {
      if (elements.gauge) elements.gauge.dataset.regime = "invalid";
      setText(elements.gaugeUnit, "AWAITING INPUT");
      setText(elements.gaugeTemperature, "—");
      setText(elements.gaugeCondition, "AWAITING INPUT");
      setText(
        elements.gaugeNote,
        "Enter a valid temperature to read its thermal character.",
      );
      if (elements.gaugeProgress)
        elements.gaugeProgress.style.strokeDashoffset = "100";
      if (elements.smokeFill) {
        elements.smokeFill.setAttribute("y", "275");
        elements.smokeFill.setAttribute("height", "0");
      }
      if (elements.smokeClouds)
        elements.smokeClouds.style.transform = "translateY(0px)";
      return;
    }

    const profile =
      state.profile ||
      Converter.getTemperatureProfile(validation.value, state.unit);
    const percentage = state.gaugePercentage;
    const fillHeight = Math.max(0, Math.min(220, (220 * percentage) / 100));
    const info = unitInfo();
    const displayValue = Converter.formatTemperature(
      validation.value,
      state.unit,
      state.precision,
    );

    if (elements.gauge) {
      elements.gauge.dataset.regime = profile.regime;
      elements.gauge.style.setProperty("--gauge-level", `${percentage}%`);
    }
    if (elements.gaugeProgress) {
      elements.gaugeProgress.style.strokeDasharray = "100";
      elements.gaugeProgress.style.strokeDashoffset = String(100 - percentage);
    }
    if (elements.smokeFill) {
      elements.smokeFill.setAttribute("y", String(275 - fillHeight));
      elements.smokeFill.setAttribute("height", String(fillHeight));
    }
    if (elements.smokeClouds) {
      elements.smokeClouds.style.transform = `translateY(${-Math.max(0, fillHeight * 0.72)}px)`;
      elements.smokeClouds.style.opacity = String(
        Math.min(1, 0.28 + percentage / 125),
      );
    }
    [elements.smokeWaveBack, elements.smokeWaveFront].forEach((wave, index) => {
      if (!wave) return;
      wave.style.transform = `translateY(${-Math.max(0, fillHeight * (index ? 0.9 : 0.76))}px)`;
      wave.style.opacity = String(Math.min(0.9, 0.12 + percentage / 115));
    });

    setText(elements.gaugeUnit, info.label);
    setText(
      elements.gaugeTemperature,
      `${displayValue}${info.symbol === "K" ? " K" : "°"}`,
    );
    setText(elements.gaugeCondition, profile.label);
    setText(elements.gaugeNote, profile.note);
  }

  function updateSlider() {
    if (!elements.slider) return;
    const bounds = Converter.getSliderBounds(state.unit);
    elements.slider.min = String(bounds.min);
    elements.slider.max = String(bounds.max);
    elements.slider.step = String(bounds.step);
    elements.slider.value = String(
      Math.min(
        bounds.max,
        Math.max(
          bounds.min,
          state.validation && state.validation.valid
            ? state.validation.value
            : 0,
        ),
      ),
    );
    setText(
      elements.sliderMin,
      `${Converter.formatTemperature(bounds.min, state.unit, 2)} ${unitInfo().symbol}`,
    );
    setText(
      elements.sliderMax,
      `${Converter.formatTemperature(bounds.max, state.unit, 0)} ${unitInfo().symbol}`,
    );
    setText(
      elements.sliderOutput,
      `${Converter.formatTemperature(elements.slider.value, state.unit, state.precision)} ${unitInfo().symbol}`,
    );
  }

  function updatePresetSelection() {
    if (!elements.presetGrid) return;
    const currentCelsius =
      state.validation && state.validation.valid
        ? state.validation.celsius
        : null;
    $$("[data-preset]", elements.presetGrid).forEach((button) => {
      const preset = Converter.getPresets().find(
        (item) => item.id === button.dataset.preset,
      );
      const selected = Boolean(
        preset &&
        currentCelsius !== null &&
        Math.abs(preset.celsius - currentCelsius) < 1e-8,
      );
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function render() {
    if (!elements.input || !elements.unit) return;
    const rawValue = elements.input.value;
    state.unit = Converter.normalizeUnit(elements.unit.value) || "C";
    state.validation = Converter.validateTemperature(rawValue, state.unit);

    if (!state.validation.valid) {
      state.results = null;
      state.profile = null;
      state.gaugePercentage = 0;
      if (elements.inputError) {
        elements.inputError.textContent = state.validation.error;
        elements.inputError.hidden = false;
      }
      elements.input.setAttribute("aria-invalid", "true");
      renderGauge();
      return false;
    }

    if (elements.inputError) {
      elements.inputError.textContent = "";
      elements.inputError.hidden = true;
    }
    elements.input.removeAttribute("aria-invalid");
    state.value = state.validation.value;
    state.results = Converter.convertAll(state.value, state.unit);
    state.profile = Converter.getTemperatureProfile(state.value, state.unit);
    state.gaugePercentage = Converter.getGaugePercentage(
      state.value,
      state.unit,
    );
    renderResults();
    renderGauge();
    updateSlider();
    updatePresetSelection();
    return true;
  }

  function setTemperature(value, unit = state.unit, options = {}) {
    const normalizedUnit = Converter.normalizeUnit(unit);
    if (!normalizedUnit) return false;
    const number = Number(value);
    const validation = Converter.validateTemperature(number, normalizedUnit);
    if (!validation.valid) {
      showToast(validation.error, "warning");
      return false;
    }
    elements.unit.value = normalizedUnit;
    elements.input.value = String(validation.value);
    state.lastRecordedKey = "";
    const valid = render();
    if (valid && options.record)
      recordCurrentConversion(options.source || "interaction");
    if (valid && options.sound !== false)
      playSound(options.soundName || "select");
    return valid;
  }

  function swapUnits() {
    if (!render()) return;
    const currentUnit = state.unit;
    const targetUnit = ["C", "F", "K"].find((unit) => unit !== currentUnit);
    if (!targetUnit) return;
    const converted = state.results[targetUnit];
    setTemperature(converted, targetUnit, {
      record: true,
      source: "swap",
      soundName: "swap",
    });
    showToast(`Switched to ${Converter.getUnitInfo(targetUnit).name}.`);
  }

  function reset() {
    setTemperature(25, "C", { record: false, soundName: "click" });
    state.lastRecordedKey = "";
    showToast("Converter reset to 25 °C.");
  }

  async function copyText(text, successMessage = "Copied to clipboard.") {
    try {
      if (navigator.clipboard && root.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const temporary = document.createElement("textarea");
        temporary.value = text;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.appendChild(temporary);
        temporary.select();
        const copied = document.execCommand("copy");
        temporary.remove();
        if (!copied) throw new Error("Clipboard access was denied.");
      }
      showToast(successMessage, "success");
      playSound("copy");
      return true;
    } catch (error) {
      console.warn("[TEMPORA] Clipboard operation failed.", error);
      showToast("Could not copy. Check your browser permissions.", "warning");
      return false;
    }
  }

  function copyResult(unit) {
    if (!state.results || !["C", "F", "K"].includes(unit)) return;
    const info = Converter.getUnitInfo(unit);
    const value = Converter.formatTemperature(
      state.results[unit],
      unit,
      state.precision,
    );
    copyText(`${value} ${info.symbol}`, `${info.name} result copied.`);
  }

  function copyAllResults() {
    if (!state.results) return;
    const lines = ["TEMPORA CONVERSION"];
    ["C", "F", "K"].forEach((unit) => {
      const info = Converter.getUnitInfo(unit);
      lines.push(
        `${info.name}: ${Converter.formatTemperature(state.results[unit], unit, state.precision)} ${info.symbol}`,
      );
    });
    copyText(lines.join("\n"), "All temperature scales copied.");
  }

  function applyPrecision(value) {
    const precision = Math.min(6, Math.max(0, Number.parseInt(value, 10)));
    if (!Number.isInteger(precision)) return;
    state.precision = precision;
    state.preferences.precision = precision;
    if (elements.precision) elements.precision.value = String(precision);
    if (elements.settingPrecision)
      elements.settingPrecision.value = String(precision);
    savePreferences();
    state.lastRecordedKey = "";
    render();
  }

  function setReducedMotion(enabled) {
    state.preferences.reducedMotion = Boolean(enabled);
    document.documentElement.classList.toggle(
      "reduce-motion",
      state.preferences.reducedMotion,
    );
    if (elements.settingMotion)
      elements.settingMotion.checked = state.preferences.reducedMotion;
    if (elements.motionToggle)
      elements.motionToggle.setAttribute(
        "aria-pressed",
        String(state.preferences.reducedMotion),
      );
    savePreferences();
  }

  function setSoundEnabled(enabled) {
    state.preferences.soundEnabled = Boolean(enabled);
    if (elements.settingSound)
      elements.settingSound.checked = state.preferences.soundEnabled;
    if (elements.soundToggle) {
      elements.soundToggle.setAttribute(
        "aria-pressed",
        String(state.preferences.soundEnabled),
      );
      elements.soundToggle.title = state.preferences.soundEnabled
        ? "Sound on"
        : "Sound off";
    }
    if (
      root.TemporaSound &&
      typeof root.TemporaSound.setEnabled === "function"
    ) {
      root.TemporaSound.setEnabled(state.preferences.soundEnabled);
    }
    savePreferences();
    if (state.preferences.soundEnabled) playSound("toggle");
  }

  function setView(viewName) {
    const validViews = ["convert", "compare", "history"];
    const target = validViews.includes(viewName) ? viewName : "convert";
    $$("[data-view]").forEach((button) => {
      const active = button.dataset.view === target;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    $$("[data-view-panel]").forEach((panel) => {
      const active = panel.dataset.viewPanel === target;
      panel.classList.toggle("view--active", active);
      panel.hidden = !active;
    });
    if (target === "history") refreshHistory();
    if (target === "compare") refreshComparison();
    playSound("navigate");
  }

  function refreshHistory() {
    const history = root.TemporaHistory;
    if (!history) return;
    if (typeof history.render === "function") {
      history.render(state.historyPeriod);
    } else if (typeof history.getRecords === "function") {
      const records = history.getRecords();
      setText(
        elements.historyTotal,
        `${records.length} ${records.length === 1 ? "conversion" : "conversions"} recorded`,
      );
    }
  }

  function refreshComparison() {
    const comparison = root.TemporaComparison;
    if (comparison && typeof comparison.render === "function")
      comparison.render();
  }

  function applyPreset(presetId) {
    const preset = Converter.getPresets().find((item) => item.id === presetId);
    if (!preset) return;
    const value = Converter.fromCelsius(preset.celsius, state.unit);
    setTemperature(value, state.unit, {
      record: true,
      source: "preset",
      soundName: "select",
    });
    showToast(`${preset.label}: ${preset.description}`);
  }

  function openSettings() {
    if (
      elements.settingsDialog &&
      typeof elements.settingsDialog.showModal === "function"
    ) {
      if (!elements.settingsDialog.open) elements.settingsDialog.showModal();
    }
  }

  function closeSettings() {
    if (elements.settingsDialog && elements.settingsDialog.open)
      elements.settingsDialog.close();
  }

  function addComparisonEntry() {
    const comparison = root.TemporaComparison;
    if (!comparison || typeof comparison.add !== "function") {
      showToast("Comparison module is not ready yet.", "warning");
      return;
    }
    if (!render()) return;
    comparison.add({
      inputValue: state.validation.value,
      inputUnit: state.unit,
      celsius: state.results.C,
      fahrenheit: state.results.F,
      kelvin: state.results.K,
      timestamp: Date.now(),
    });
    refreshComparison();
    showToast("Temperature added to comparison.", "success");
    playSound("select");
  }

  function bindEvents() {
    if (elements.input) {
      elements.input.addEventListener("input", () => {
        state.lastRecordedKey = "";
        render();
      });
      elements.input.addEventListener("change", () => {
        if (render()) recordCurrentConversion("input");
      });
      elements.input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (render()) {
            recordCurrentConversion("input");
            elements.input.blur();
          }
        }
      });
    }

    if (elements.unit) {
      elements.unit.addEventListener("change", () => {
        state.lastRecordedKey = "";
        if (render()) recordCurrentConversion("unit-change");
        playSound("select");
      });
    }

    if (elements.slider) {
      elements.slider.addEventListener("input", () => {
        elements.input.value = elements.slider.value;
        state.lastRecordedKey = "";
        render();
      });
      elements.slider.addEventListener("change", () => {
        if (render()) recordCurrentConversion("slider");
      });
    }

    if (elements.swap) elements.swap.addEventListener("click", swapUnits);
    if (elements.precision)
      elements.precision.addEventListener("change", (event) =>
        applyPrecision(event.target.value),
      );
    if (elements.settingPrecision)
      elements.settingPrecision.addEventListener("change", (event) =>
        applyPrecision(event.target.value),
      );
    if (elements.settingMotion)
      elements.settingMotion.addEventListener("change", (event) =>
        setReducedMotion(event.target.checked),
      );
    if (elements.settingSound)
      elements.settingSound.addEventListener("change", (event) =>
        setSoundEnabled(event.target.checked),
      );
    if (elements.settingsOpen)
      elements.settingsOpen.addEventListener("click", openSettings);
    if (elements.soundToggle)
      elements.soundToggle.addEventListener("click", () =>
        setSoundEnabled(!state.preferences.soundEnabled),
      );
    if (elements.motionToggle)
      elements.motionToggle.addEventListener("click", () =>
        setReducedMotion(!state.preferences.reducedMotion),
      );
    if (elements.copyAll)
      elements.copyAll.addEventListener("click", copyAllResults);
    if (elements.comparisonAdd)
      elements.comparisonAdd.addEventListener("click", addComparisonEntry);
    if (elements.presetGrid) {
      elements.presetGrid.addEventListener("click", (event) => {
        const button = event.target.closest("[data-preset]");
        if (button) applyPreset(button.dataset.preset);
      });
    }

    document.addEventListener("click", (event) => {
      const copyButton = event.target.closest("[data-copy-result]");
      if (copyButton) copyResult(copyButton.dataset.copyResult);
      const viewButton = event.target.closest("[data-view]");
      if (viewButton) setView(viewButton.dataset.view);
      const periodButton = event.target.closest("[data-history-period]");
      if (periodButton) {
        state.historyPeriod = periodButton.dataset.historyPeriod;
        $$("[data-history-period]").forEach((button) => {
          const active = button === periodButton;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        });
        state.preferences.historyPeriod = state.historyPeriod;
        savePreferences();
        refreshHistory();
      }
    });

    if (elements.historyExport)
      elements.historyExport.addEventListener("click", () => {
        const history = root.TemporaHistory;
        if (history && typeof history.exportCSV === "function")
          history.exportCSV();
        else showToast("History export is not ready yet.", "warning");
      });
    if (elements.historyClear)
      elements.historyClear.addEventListener("click", () => {
        const history = root.TemporaHistory;
        if (!history || typeof history.clear !== "function") return;
        const confirmed = root.confirm(
          "Clear all TEMPORA conversion history? This cannot be undone.",
        );
        if (!confirmed) return;
        history.clear();
        refreshHistory();
        showToast("Conversion history cleared.");
      });

    if (elements.settingsDialog) {
      elements.settingsDialog.addEventListener("click", (event) => {
        if (event.target === elements.settingsDialog) closeSettings();
      });
      elements.settingsDialog.addEventListener("close", () =>
        playSound("close"),
      );
    }
  }

  function initializeSupportingModules() {
    if (
      root.TemporaSound &&
      typeof root.TemporaSound.setEnabled === "function"
    ) {
      root.TemporaSound.setEnabled(state.preferences.soundEnabled);
    }
    if (root.TemporaHistory && typeof root.TemporaHistory.init === "function") {
      root.TemporaHistory.init({ onChange: refreshHistory });
    }
    if (
      root.TemporaComparison &&
      typeof root.TemporaComparison.init === "function"
    ) {
      root.TemporaComparison.init({ onChange: refreshComparison });
    }
    if (
      root.TemporaInteractions &&
      typeof root.TemporaInteractions.init === "function"
    ) {
      root.TemporaInteractions.init({
        swap: swapUnits,
        reset,
        openHistory: () => setView("history"),
        copy: copyAllResults,
        close: closeSettings,
        showToast,
      });
    }
  }

  function applySavedPreferences() {
    state.preferences = readPreferences();
    state.precision = state.preferences.precision;
    state.historyPeriod = state.preferences.historyPeriod;
    if (elements.precision) elements.precision.value = String(state.precision);
    if (elements.settingPrecision)
      elements.settingPrecision.value = String(state.precision);
    setReducedMotion(state.preferences.reducedMotion);
    setSoundEnabled(state.preferences.soundEnabled);
    $$("[data-history-period]").forEach((button) => {
      const active = button.dataset.historyPeriod === state.historyPeriod;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function init() {
    if (!elements.input || !elements.unit) return;
    if (elements.footerYear)
      setText(elements.footerYear, String(new Date().getFullYear()));
    applySavedPreferences();
    bindEvents();
    initializeSupportingModules();
    render();
    refreshHistory();
    refreshComparison();
    if (
      root.matchMedia &&
      root.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !state.preferences.reducedMotion
    ) {
      // Respect the operating system preference without persisting an override.
      document.documentElement.classList.add("system-reduced-motion");
    }
    document.documentElement.classList.add("app-ready");
  }

  const api = Object.freeze({
    addComparisonEntry,
    applyPreset,
    closeSettings,
    copyAllResults,
    copyResult,
    getState: () => ({ ...state, preferences: { ...state.preferences } }),
    openSettings,
    recordCurrentConversion,
    refreshComparison,
    refreshHistory,
    render,
    reset,
    setReducedMotion,
    setSoundEnabled,
    setTemperature,
    setView,
    showToast,
    swapUnits,
  });

  root.TemporaApp = api;
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(typeof window !== "undefined" ? window : globalThis);
