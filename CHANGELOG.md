# Changelog

## [3.0.0] - 2025-05-07

### Major Update

A comprehensive upgrade covering type safety, security, UX, and new features.

### New Features

- **Watchlist** — Star coins via right-click to pin them to top of list, persisted across sessions
- **Price Alerts** — Set target price for any coin, get notified on threshold crossing, manage via command palette
- **Multi-currency** — New `currency` config supporting USD / EUR / CNY / JPY / KRW / GBP
- **Sparkline** — Optional 7-day trend line in tooltip via `showSparkline` config
- **Status Bar** — Shows last update time and data source in status bar, click to refresh
- **Detail External Links** — Quick links to CoinGecko / Binance in detail panel

### Improvements

- **Auto-refresh** — `refreshInterval` config now works (set 0 to disable)
- **Config生效** — `defaultLimit`, `preferredDataSource`, `currency` all read from settings and trigger re-fetch on change
- **Silent Refresh** — First load shows loading spinner, subsequent refreshes update in background without flicker
- **Search** — Remembers previous search term, clear command, match count in title
- **Sort Indicator** — Tree title shows current sort field and direction (`[MCap ↓]`, `[24h ↑]`)
- **Loading/Error States** — Loading spinner on first load, error item with retry on API failure
- **Detail Panel Reuse** — Reuses single webview panel instead of creating new ones
- **Detail Layout** — Grid layout, adaptive price precision (2 decimals for large caps, 8 for small caps)
- **XSS Fix** — All dynamic content in detail HTML is escaped

### Refactoring

- **Type Safety** — New `CoinMarket` interface, all `any` types eliminated
- **API Config** — `CryptoApiConfig` interface formalized with `currency` and `sparkline` params
- **API Failover** — Fixed hardcoded `% 2` modulo, `preferredDataSource` config now respected
- **Dead Code Removed** — Deleted unused `WebviewProvider`, `htmlContent`, `node-fetch` dependency
- **Build Artifacts** — Removed historical `.vsix` files from repository

### Configuration Changes

| Setting | Change |
|---|---|
| `cryptoPriceViewer.refreshInterval` | Now functional (was a no-op) |
| `cryptoPriceViewer.defaultLimit` | Now functional (was a no-op) |
| `cryptoPriceViewer.preferredDataSource` | Now functional (was a no-op) |
| `cryptoPriceViewer.currency` | **New**, default `usd` |
| `cryptoPriceViewer.showSparkline` | **New**, default `false` |

---

## [2.0.2] - 2025-05-27

### Improvements

- Enhanced detail view with structured layout
- Added ATH/ATL display with dates and percentages in tooltip and detail view
- Improved price and market cap formatting

## [2.0.1] - 2025-02-24

### Bug Fixes

- Fixed crash when data fields are null
- Added null checks to all numeric displays
- Shows "N/A" instead of crashing on missing data

### Improvements

- Added sort by market cap (ascending/descending toggle)
- Added sort by 24h price change (ascending/descending toggle)
- Sort direction shown in notification message

## [2.0.0] - 2025-01-11

### Improvements

- Restructured project architecture
- Redesigned UI with VS Code TreeView
- Added Binance fallback API
- Improved error handling and auto-retry
- Data persistence across view switches

### New Features

- Lock-up info display for non-fully circulating tokens
- Detailed supply info view
- Market cap ranking display
- Improved search responsiveness

### UI

- Native VS Code icons and theme support
- Loading skeleton screen
- Enhanced tooltip with detailed info
- Click-to-view detail panel

## [1.0.0] - 2024-12-17

### Initial Release

- Top 200 cryptocurrency real-time prices
- 24h price changes and volume
- Market cap ranking and details
- Search by name and symbol
- Supply info display
- CoinGecko API data source
- Manual data refresh
- Native VS Code UI
