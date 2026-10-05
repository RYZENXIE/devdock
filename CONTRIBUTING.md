# Contributing to DevDock

Thanks for helping out! DevDock is intentionally tiny: plain HTML, CSS and JS with **zero runtime dependencies**.

## Ground rules

- **No dependencies and no build step.** If it needs `npm install` to run, it does not belong in the app.
- **Everything stays local.** Tools must never send user input over the network.
- **Keep logic testable.** Put pure functions in `lib.js` and add tests in `tests/lib.test.js`.
- **Render user text with `textContent`** (never `innerHTML`) to avoid XSS.

## Add a tool

1. Add an object to the `TOOLS` array in `app.js` (see the example in the README).
2. Put any pure logic in `lib.js` and export it.
3. Add unit tests, then run `npm test`.
4. Update the tools table in the README.

## Development

```bash
python3 -m http.server 8000    # then open http://localhost:8000
npm test                       # unit tests (Node 18+)
```

## Pull requests

- One feature or fix per PR, with a short description and a screenshot for UI changes.
- Make sure `npm test` passes.
