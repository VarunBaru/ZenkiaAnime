# Home page improvement

- [x] Add dynamic Watch Now action to the existing featured anime
- [x] Enhance Continue Watching with account-only removal
- [x] Add account-only My Watchlist with watch and removal actions
- [x] Preserve cached Jikan popular and seasonal rails with loading/error states
- [x] Verify desktop, tablet, mobile, links, errors, and account visibility

# Jikan loading reliability

- [ ] Centralize and throttle Jikan requests, caching successful responses and avoiding duplicate requests
- [ ] Use controlled exponential retries with development-only diagnostics and stale fallback
- [ ] Keep homepage sections independent with skeletons, individual retry, and a non-fake featured fallback
- [ ] Validate homepage, trending, popular, search, anime details, retry, and outage behavior
