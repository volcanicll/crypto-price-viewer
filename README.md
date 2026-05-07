# Crypto Price Viewer for VS Code

Real-time cryptocurrency price tracking, market data visualization, price alerts, and watchlist management.

## Features

**Real-time Market Data**
- Display prices of top 100/200/500 cryptocurrencies with auto-refresh
- 24h price changes, trading volume, market cap ranking
- All-time High (ATH) and All-time Low (ATL) with dates and percentages
- 7-day sparkline trend in tooltip (optional)
- Multiple currencies: USD, EUR, CNY, JPY, KRW, GBP

**Watchlist**
- Star coins to pin them to the top of the list
- Persisted across sessions
- Quick add/remove via right-click context menu

**Price Alerts**
- Set target price for any coin
- Get notified when price crosses the threshold
- Manage alerts via command palette

**Search & Sort**
- Search by name or symbol with match count
- Sort by market cap or 24h price change (toggle ascending/descending)
- Visual sort direction indicator in tree title

**Data Sources**
- Primary: CoinGecko API
- Fallback: Binance API
- Automatic failover with retry
- Preferred source configurable in settings

**Status Bar**
- Shows last update time and active data source
- Click to refresh

## Configuration

| Setting | Default | Description |
|---|---|---|
| `cryptoPriceViewer.refreshInterval` | `30` | Auto-refresh interval in seconds (0 to disable) |
| `cryptoPriceViewer.defaultLimit` | `200` | Number of coins to display (100 / 200 / 500) |
| `cryptoPriceViewer.preferredDataSource` | `CoinGecko` | Preferred API source |
| `cryptoPriceViewer.currency` | `usd` | Display currency (usd, eur, cny, jpy, krw, gbp) |
| `cryptoPriceViewer.showSparkline` | `false` | Show 7-day sparkline trend in tooltip |

## Commands

| Command | Description |
|---|---|
| `Refresh Prices` | Fetch latest data |
| `Search Coin` | Filter by name or symbol |
| `Clear Search` | Reset search filter |
| `Sort by Market Cap` | Toggle market cap sort |
| `Sort by 24h Change` | Toggle 24h change sort |
| `Add/Remove from Watchlist` | Toggle watchlist star |
| `Set Price Alert` | Set a price threshold alert |
| `Manage Price Alerts` | View and remove alerts |

## Installation

Search for **Crypto Price Viewer** in VS Code extensions or visit the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=volcanic.crypto-price-viewer).

## Privacy

This extension does not collect any personal information. It only fetches public market data from CoinGecko and Binance APIs.

## License

[MIT License](LICENSE)
