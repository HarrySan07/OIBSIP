# TEMPORA — Precision Temperature Conversion

TEMPORA is a responsive temperature-conversion experience built with semantic HTML, modern CSS, and vanilla JavaScript. Its visual direction combines a dark Gothic atmosphere with translucent liquid-glass panels, adaptive motion, and a central bottom-up smoke gauge.

## Core capabilities

- Convert between Celsius, Fahrenheit, and Kelvin in all six directions.
- Update results live while entering a value or changing the source unit.
- Swap the source and comparison units without losing the current measurement.
- Validate numeric input and enforce absolute zero as the lower physical limit.
- Adjust displayed decimal precision without rounding intermediate calculations.
- Copy an individual result or all converted values.
- Explore reference temperatures through quick presets and a fine-adjustment slider.
- View an adaptive semicircular temperature gauge with a bottom-up animated smoke effect.
- Compare multiple temperature entries side by side.
- Keep a persistent conversion history in browser LocalStorage.
- Browse history hierarchically: individual records for today and days in the active Monday–Sunday week; completed weeks grouped by week; completed calendar months grouped by month; and completed calendar years grouped by year.
- Open grouped history to inspect the original conversion records. Grouping is a view over the original timestamped records, not destructive aggregation.
- Use keyboard shortcuts, optional Web Audio feedback, reduced-motion preferences, and CSV export.

## Technology

- HTML5 for semantic structure and accessible controls.
- CSS3 for the liquid-glass visual system, layout, responsive behaviour, and animation.
- Vanilla JavaScript (ES modules are not required) for conversion logic, state, interactions, persistence, comparison, and sound.
- LocalStorage for local browser persistence.
- Web Audio API for optional interface sounds.
- SVG for the temperature gauge and vector details.

No server, account, build process, framework, or paid API is required. TEMPORA can be hosted as a static site, including on GitHub Pages.

## Run locally

Open `index.html` in a modern browser. For the most reliable local development experience, serve the project directory with any simple static HTTP server, then open the local address it provides.

## Project structure

```text
Task-3-Temperature-Converter/
├── index.html
├── README.md
├── assets/
│   ├── icons/
│   └── sounds/
├── css/
│   ├── style.css
│   ├── animations.css
│   └── responsive.css
└── js/
    ├── app.js
    ├── converter.js
    ├── interactions.js
    ├── history.js
    ├── comparison.js
    └── sound.js
```

## Conversion and validation notes

All conversions use the exact relationships between the three scales. Values below absolute zero are invalid:

- Celsius: `-273.15 °C`
- Fahrenheit: `-459.67 °F`
- Kelvin: `0 K`

Display formatting is applied only after calculations. History records retain their original values, units, and timestamps so that daily, weekly, monthly, and yearly views can be rebuilt without losing detail.

## History calendar rules

- The current day shows its individual conversion records and total count.
- Days in the active week are shown separately until that week is complete.
- Weeks run Monday through Sunday.
- Completed weeks are presented as weekly groups.
- Completed calendar months are presented as monthly groups.
- Completed calendar years are presented as yearly groups.
- Expanding a group reveals its underlying records and child periods where applicable.

## Accessibility and preferences

The interface is designed for keyboard use and responsive layouts. Motion can be reduced, and sound feedback is optional. Sound is off until the user enables it. Visual temperature cues are accompanied by textual readings and labels so the gauge is not the only source of information.

## Privacy

Conversion history and preferences are stored locally in the browser using LocalStorage. They are not uploaded to a TEMPORA server. Clearing browser site data removes the locally stored records. CSV export is initiated by the user.

## Project status

The project is developed incrementally, one file at a time. This README describes the intended feature set and architecture; individual features are considered complete only after implementation and testing.
