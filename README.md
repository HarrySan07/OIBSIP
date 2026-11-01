# OIBSIP — Web Development & Designing

<p align="center">
  <img src="https://img.shields.io/badge/Oasis%20Infobyte-Internship-111111?style=for-the-badge" alt="Oasis Infobyte Internship">
  <img src="https://img.shields.io/badge/Track-Web%20Development%20%26%20Designing-444444?style=for-the-badge" alt="Web Development and Designing">
  <img src="https://img.shields.io/badge/Level-1-666666?style=for-the-badge" alt="Level 1">
</p>

<h1 align="center">OIBSIP Project Hub</h1>
<p align="center">A collection of web projects developed for the Oasis Infobyte Web Development &amp; Designing Internship.</p>
<p align="center"><a href="https://harrysan07.github.io/OIBSIP/">Open Project Hub</a> · <a href="https://github.com/HarrySan07/OIBSIP">View Repository</a></p>

---

## About this repository

This repository contains the three Level 1 assignments developed as part of the **Oasis Infobyte Web Development &amp; Designing Internship**. Each assignment is maintained as a separate project with its own source files and README. The root `index.html` acts as the project hub and links to each task.

The projects use web fundamentals—HTML, CSS, and JavaScript—with no application framework or backend required.

## Internship tasks

### Task 1 — Landing Page: THE INNER ATLAS

**Status: Completed**

A monochrome Gothic-inspired editorial landing page exploring psychology, philosophy, identity, perception, belief, and human nature. It combines expressive typography, conceptual imagery, structured content sections, and an interactive reflection exercise.

- **Project:** [Open THE INNER ATLAS](./Task-1-Landing-Page/)
- **Live website:** [Open deployed landing page](https://harrysan07.github.io/OIBSIP/Task-1-Landing-Page/)
- **Project documentation:** [Task 1 README](./Task-1-Landing-Page/README.md)

**Highlights**

- Monochrome Gothic editorial visual direction.
- Responsive page structure and section navigation.
- Conceptual image sections about identity, perception, morality, and existence.
- Interactive “Mirror of Belief” reflection exercise.
- Semantic HTML and keyboard/accessibility considerations.

**Technologies:** HTML5, CSS3, JavaScript, SVG, and WebP assets.

### Task 2 — Personal Portfolio

**Status: Completed**

A personal portfolio presenting profile information, mechanical-engineering interests, technical skills, selected work, internship experience, and professional contact links.

- **Project:** [Open portfolio source](./Task-2-Portfolio/)
- **Live portfolio:** [Open deployed portfolio](https://harry13181.github.io/Portfolio/)
- **Project documentation:** [Task 2 README](./Task-2-Portfolio/README.md)

**Highlights**

- Personal profile and professional introduction.
- Technical skills and engineering interests.
- Project and internship information.
- GitHub, LinkedIn, and contact links.

**Technologies:** HTML5, CSS3, and JavaScript. The current portfolio page keeps its presentation and interactions in its existing page implementation.

### Task 3 — Temperature Converter: TEMPORA

**Status: Implemented**

**TEMPORA** is an advanced temperature-conversion experience with a dark Gothic atmosphere, translucent liquid-glass panels, dynamic motion, and a central semicircular gauge. The gauge uses bottom-up animated black smoke to represent the selected temperature.

- **Project:** [Open TEMPORA](./Task-3-Temperature-Converter/TEMPORA/)
- **Project documentation:** [TEMPORA README](./Task-3-Temperature-Converter/TEMPORA/README.md)
- **GitHub Pages route:** `https://harrysan07.github.io/OIBSIP/Task-3-Temperature-Converter/TEMPORA/` (available after the updated files are pushed and Pages finishes deploying)

**Highlights**

- Convert between Celsius, Fahrenheit, and Kelvin in all six directions.
- Live conversion, unit swapping, input validation, and absolute-zero checks.
- Adjustable decimal precision and copyable results.
- Interactive temperature slider and quick reference presets.
- Adaptive semicircular temperature gauge with bottom-up smoke animation.
- Multiple-temperature comparison.
- Persistent conversion history stored in browser LocalStorage.
- Hierarchical history views: individual records for today and days in the active Monday–Sunday week; completed weeks grouped by week; completed calendar months grouped by month; and completed calendar years grouped by year.
- Expandable groups retain access to their original timestamped conversion records.
- Keyboard shortcuts, optional Web Audio API sound feedback, and CSV export.
- Responsive styling and reduced-motion support.

**Technologies:** HTML5, CSS3, vanilla JavaScript, SVG, LocalStorage, and Web Audio API.

TEMPORA is a static project. It does not require a server-side application, account, framework, build process, or paid API. Its history and preferences are stored locally in the browser.

---

## Repository structure

The Task 3 ZIP contains an inner `TEMPORA/` directory. Preserve that directory when extracting it into `Task-3-Temperature-Converter/` so the project hub link resolves correctly.

```text
OIBSIP/
├── index.html
├── README.md
│
├── Task-1-Landing-Page/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── README.md
│   └── assets/
│       ├── icons/
│       └── images/
│
├── Task-2-Portfolio/
│   ├── index.html
│   └── README.md
│
└── Task-3-Temperature-Converter/
    └── TEMPORA/
        ├── index.html
        ├── README.md
        ├── assets/
        │   └── icons/
        │       └── favicon.svg
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

## Open the project hub

Visit **[OIBSIP Project Hub](https://harrysan07.github.io/OIBSIP/)** to access the task cards. Each card opens the corresponding project directory.

## Run the projects locally

1. Clone the repository:

   ```bash
   git clone https://github.com/HarrySan07/OIBSIP.git
   ```

2. Open the directory for the task you want to explore.
3. Open that project's `index.html` in a modern browser. A simple local static server or the VS Code Live Server extension is recommended for development.

The projects do not require a package installation or compilation step. TEMPORA can be opened from `Task-3-Temperature-Converter/TEMPORA/index.html` after extraction.

## Project status and verification

All three task folders and their project documentation have been assembled in the repository. Before submitting, open each project locally and check its key interactions, browser console, responsive layout, and asset loading. After pushing the updated files, confirm that the GitHub Pages deployment succeeds and test all three links from the project hub.

## Internship information

| Detail       | Information                                    |
| ------------ | ---------------------------------------------- |
| Organization | Oasis Infobyte                                 |
| Track        | Web Development &amp; Designing                |
| Level        | Level 1                                        |
| Repository   | [OIBSIP](https://github.com/HarrySan07/OIBSIP) |
| Assignments  | Landing Page, Portfolio, Temperature Converter |

## Author

**Hari Prasath P**

- GitHub: [Harry13181](https://github.com/Harry13181)
- LinkedIn: [Hari Prasath P](https://linkedin.com/in/hari-prasath-p-bb4b11404)

---

<p align="center"><em>Built as part of the Oasis Infobyte Web Development &amp; Designing Internship.</em></p>
