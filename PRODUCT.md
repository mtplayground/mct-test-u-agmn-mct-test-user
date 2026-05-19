# ZeroClaw Product Contract

## What It Is

ZeroClaw is a browser-based Minesweeper game built with Vite and strict
TypeScript. It is a client-only app with no backend or database dependency.

## What It Does

- Renders a playable Minesweeper board with Easy, Medium, Hard, and validated
  custom board sizes.
- Guarantees first-click safety by excluding the clicked cell and its neighbors
  from mine placement.
- Supports reveal, flood-fill of empty regions, flag and question-mark cycling,
  win/loss detection, and a limited per-game hint action.
- Tracks elapsed time, remaining mine count, status text, and best times for
  preset difficulties in `localStorage`.
- Provides responsive desktop and mobile play: click/right-click on desktop,
  tap/long-press on touch devices.
- Includes dark mode persistence, a mute toggle for Web Audio sound effects,
  instructions, and win/loss overlay feedback.

## Accessibility

- The board is exposed as a labelled grid inside a board landmark.
- Cells have state-aware labels such as hidden, flagged, mine, no adjacent
  mines, or numbered adjacent-mine counts.
- Keyboard play is supported with arrow-key cell navigation, Enter/Space to
  reveal, and `F` to flag.
- Focus-visible styles are explicit for controls and board cells.

## Architecture

- `src/game/` contains pure game logic: board creation, adjacency, first-click
  mine placement, reveal/flood-fill, flag cycling, and the game state machine.
- `src/input/` normalizes long-press and pointer/keyboard interactions into
  reveal and flag events.
- `src/ui/` contains DOM renderers/controllers for the app shell, board,
  controls, status bar, overlay, and theme toggle.
- `src/persistence/` owns browser storage for best times.
- `src/audio/` owns bundled OGG sound effects and Web Audio playback.
- Styles are split across base layout, board visuals, and theme variables.

## Conventions

- Use strict TypeScript and small framework-free DOM modules.
- Keep core game behavior testable as pure functions where possible.
- Validate custom boards before restarting: rows/columns are 5-40 and mines
  must leave room for first-click safety.
- Serve production builds from the site root because Vite emits root-relative
  `/assets/...` references in `dist/index.html`.
- Standard checks are `npm run test`, `npm run lint`, `npm run format:check`,
  `npm run build`, and `npm run test:e2e`.
