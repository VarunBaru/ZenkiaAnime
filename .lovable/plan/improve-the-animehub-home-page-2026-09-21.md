# Improve the AnimeHub Home Page

## Goal

Enhance the existing home page without redesigning it or changing the player, episode system, authentication, history, watchlist, catalogue integrations, or routing.

## Changes

- Keep the current featured manga-panel hero and add a prominent dynamic **Watch now** action alongside the existing details and watchlist actions.
- Keep **Continue watching** account-only and history-backed, sorted by the existing latest-watched query. Add a remove action with confirmation, cache refresh, and a friendly failure message.
- Add an account-only **My watchlist** home section using the existing watchlist query and mutation utilities. Show recent saved titles in a responsive horizontal rail with poster, title, direct watch action, and remove action; show the requested empty state when signed in with no saved titles.
- Retain the existing real-data **Popular anime** and **This season** rails, existing clickable AnimeCard, skeleton, empty, retry, and horizontal scrolling patterns. Adjust section naming only where needed to match the requested wording.
- Ensure logged-out visitors never run private history or watchlist requests.
- Add complete route metadata fields required for the home page.

## Technical details

- Reuse TanStack Query keys `history` and `watchlist`, so card buttons and home sections share cached account data rather than refetching per card.
- Reuse `removeFromWatchlist`, `deleteHistoryEntry`, existing authentication state, and existing dynamic routes.
- The watchlist’s direct Watch action opens episode 1 because watchlist records do not store episode progress; Continue Watching continues from the saved episode.
- No database or schema changes.

## Verification

- Run the project’s TypeScript check.
- Check the live home page for console and request errors.
- Verify desktop, tablet, and mobile layouts, horizontal scrolling, public links, signed-out visibility rules, and available signed-in behavior.
- Confirm the player, Watch page, episode code, and unrelated routes remain unchanged.
