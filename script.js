
/* ==========================================================
   THE HUMAN CONDITION
   Stage 3: JavaScript Interactions

   Features:
   1. Accessible responsive navigation
   2. Mirror of Belief thought experiment
   3. Keyboard and responsive behaviour
   No libraries or dependencies required.
   ========================================================== */

(() => {
    "use strict";

    /* ------------------------------------------------------
       1. MOBILE NAVIGATION
       ------------------------------------------------------ */

    const menuToggle = document.querySelector(".menu-toggle");
    const primaryNavigation = document.querySelector("#primary-navigation");

    if (menuToggle && primaryNavigation) {
        const mobileBreakpoint = window.matchMedia("(max-width: 600px)");

        /**
         * Synchronize the mobile navigation's visual and
         * accessibility state.
         *
         * @param {boolean} shouldOpen
         * @param {{returnFocus?: boolean}} options
         */
        function setMenuOpen(shouldOpen, options = {}) {
            const isOpen = Boolean(
                shouldOpen && mobileBreakpoint.matches
            );

            primaryNavigation.classList.toggle("is-open", isOpen);

            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            menuToggle.setAttribute(
                "aria-label",
                isOpen
                    ? "Close navigation menu"
                    : "Open navigation menu"
            );

            if (!isOpen && options.returnFocus) {
                menuToggle.focus();
            }
        }

        // Toggle the menu using the navigation button.
        menuToggle.addEventListener("click", () => {
            const isCurrentlyOpen =
                menuToggle.getAttribute("aria-expanded") === "true";

            setMenuOpen(!isCurrentlyOpen);
        });

        // Close the menu after selecting an in-page link.
        primaryNavigation.addEventListener("click", (event) => {
            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            const link = target.closest('a[href^="#"]');

            if (link && mobileBreakpoint.matches) {
                setMenuOpen(false);
            }
        });

        // Allow keyboard users to dismiss the menu with Escape.
        document.addEventListener("keydown", (event) => {
            const isCurrentlyOpen =
                menuToggle.getAttribute("aria-expanded") === "true";

            if (event.key === "Escape" && isCurrentlyOpen) {
                setMenuOpen(false, { returnFocus: true });
            }
        });

        // Close the menu if the user clicks outside it.
        document.addEventListener("pointerdown", (event) => {
            const isCurrentlyOpen =
                menuToggle.getAttribute("aria-expanded") === "true";

            if (!isCurrentlyOpen) {
                return;
            }

            const target = event.target;

            if (
                target instanceof Node &&
                !primaryNavigation.contains(target) &&
                !menuToggle.contains(target)
            ) {
                setMenuOpen(false);
            }
        });

        // Reset the menu when changing between mobile and desktop.
        mobileBreakpoint.addEventListener("change", () => {
            setMenuOpen(false);
        });

        // Start with the mobile menu closed.
        setMenuOpen(false);
    }


    /* ------------------------------------------------------
       2. THE MIRROR OF BELIEF
       ------------------------------------------------------ */

    const reflectionForm = document.querySelector("#reflection-form");
    const reflectionResult = document.querySelector("#reflection-result");

    if (reflectionForm && reflectionResult) {
        const resultLabel = reflectionResult.querySelector(".result-label");
        const resultParagraph = reflectionResult.querySelector(
            "p:last-child"
        );

        const reflectionResponses = {
            defend: {
                title: "Notice the instinct to defend.",
                message:
                    "Defending an established belief can feel natural, " +
                    "especially when it is connected to identity or personal " +
                    "experience. Pause and ask: what evidence would genuinely " +
                    "make me reconsider? This response alone does not prove " +
                    "that your belief is wrong or that you are biased."
            },

            investigate: {
                title: "Examine the evidence carefully.",
                message:
                    "Investigating the source, evidence, and alternative " +
                    "explanations can help you evaluate a claim more carefully. " +
                    "Try asking whether you would use the same standards if " +
                    "the evidence supported the opposite conclusion. Good " +
                    "investigation also makes room for uncertainty."
            },

            reflect: {
                title: "Make room for your reaction.",
                message:
                    "Noticing an emotional reaction can help you understand " +
                    "why a belief matters to you. Emotion does not automatically " +
                    "make a belief false, just as feeling calm does not make " +
                    "it true. You can acknowledge your reaction and still " +
                    "examine the evidence."
            }
        };

        reflectionForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const selectedAnswer = reflectionForm.querySelector(
                'input[name="reflection-answer"]:checked'
            );

            // Do not display a result when no option is selected.
            if (!selectedAnswer) {
                reflectionForm.reportValidity();
                return;
            }

            const response = reflectionResponses[selectedAnswer.value];

            // Ignore unexpected values instead of displaying incorrect text.
            if (!response) {
                return;
            }

            if (resultLabel) {
                resultLabel.textContent = response.title;
            }

            if (resultParagraph) {
                resultParagraph.textContent = response.message;
            }

            // Move the result into view without forcibly moving focus.
            reflectionResult.scrollIntoView({
                behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches ? "auto" : "smooth",
                block: "nearest"
            });
        });
    }

})();