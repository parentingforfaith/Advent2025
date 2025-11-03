# Advent Calendar (Interactive)

Simple static web app that provides an interactive 1–24 advent calendar. Each day reveals a placeholder family conversation-starter card. Progress is stored in the browser via localStorage.

How it works
- Each of the 24 windows represents a day (1–24).
- Day 1 is always accessible.
- Other days unlock at 6:00 local time on their respective day (your local timezone).
- Clicking an unlocked day opens a modal with a placeholder question; marking it done records it in localStorage.

Files
- `index.html` — main page
- `styles.css` — styles
- `app.js` — unlocking logic, modal, progress

Run
1. Open `index.html` in your browser (double-click or open with the browser).
2. The calendar will display. Click available days to open the card.

Notes for development
- To reset progress, open devtools and run `localStorage.removeItem('advent.revealed')`.
- The unlocking logic uses the current year and your system timezone. It checks whether `new Date(currentYear, 11, day, 6, 0)` is <= now.

Developer simulation and questions
- There is a small developer toolbar at the bottom of the page where you can toggle "Use simulated date/time" and pick a `datetime-local` value. When enabled, the app will use the simulated date/time for unlocking logic. Use the Reset button to clear simulation.
- You can provide a `questions.json` file at the project root with 24 entries. Each entry should be an object with `day`, `question`, and `image` fields. The app will load `questions.json` if present and use the supplied text and image for the modal.

Next steps (optional)
- Replace placeholder questions with real content (JSON file or admin UI).
- Add animations and images from the provided design cue.
- Add server-side persistence if multiple devices/users should share progress.
