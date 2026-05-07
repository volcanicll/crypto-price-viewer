import * as vscode from "vscode";
import { CryptoStore } from "../store/CryptoStore";
import { CoinMarket } from "../types/interfaces";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMarketCap(value: number | null | undefined): string {
  if (value == null) return "N/A";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return "N/A";
  if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

function formatSparkline(prices: number[]): string {
  if (!prices || prices.length < 2) return "";
  const step = Math.max(1, Math.floor(prices.length / 16));
  const sampled = prices.filter((_, i) => i % step === 0);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;
  const chars = "▁▂▃▄▅▆▇█";
  return sampled.map((v) => chars[Math.min(7, Math.floor(((v - min) / range) * 8))]).join("");
}

export class CryptoItem extends vscode.TreeItem {
  public readonly coinId: string;

  constructor(
    public readonly coin: CoinMarket,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    private readonly isWatchlisted: boolean = false
  ) {
    super(coin.name, collapsibleState);
    this.coinId = coin.id ?? coin.symbol;

    this.iconPath = {
      light: vscode.Uri.parse(coin.image),
      dark: vscode.Uri.parse(coin.image),
    };

    const symbol = escapeHtml(coin.symbol.toUpperCase());
    const name = escapeHtml(coin.name);
    const price = formatPrice(coin.current_price);

    const priceChange =
      coin.price_change_percentage_24h != null
        ? coin.price_change_percentage_24h.toFixed(2)
        : null;
    const isUp = (coin.price_change_percentage_24h ?? 0) >= 0;
    const arrow = isUp ? "↑" : "↓";
    const changeText = priceChange != null ? ` ${arrow} ${Math.abs(parseFloat(priceChange))}%` : "";

    const starPrefix = isWatchlisted ? "⭐ " : "";
    this.label = `${starPrefix}${name} (${symbol})`;
    this.description = `${price}${changeText}`;

    this.tooltip = this.buildTooltip(coin);

    this.contextValue = isWatchlisted ? "cryptoItemWatched" : "cryptoItem";

    this.command = {
      command: "crypto-price-viewer.showDetail",
      title: "Show Details",
      arguments: [this],
    };
  }

  private buildTooltip(coin: CoinMarket): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    const supplyPercentage = coin.total_supply
      ? ((coin.circulating_supply! / coin.total_supply) * 100).toFixed(2)
      : "N/A";

    md.appendMarkdown(`### ${escapeHtml(coin.name)} (${escapeHtml(coin.symbol.toUpperCase())})\n\n`);
    md.appendMarkdown(`**Price:** ${formatPrice(coin.current_price)}\n\n`);
    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`| | |\n|---|---|\n`);
    md.appendMarkdown(`| Rank | #${coin.market_cap_rank ?? "N/A"} |\n`);
    md.appendMarkdown(`| Market Cap | ${formatMarketCap(coin.market_cap)} |\n`);
    md.appendMarkdown(`| 24h Change | ${coin.price_change_percentage_24h != null ? coin.price_change_percentage_24h.toFixed(2) + "%" : "N/A"} |\n`);
    md.appendMarkdown(`| 24h Volume | ${formatMarketCap(coin.total_volume)} |\n`);
    md.appendMarkdown(`| 24h High/Low | ${formatPrice(coin.high_24h)} / ${formatPrice(coin.low_24h)} |\n`);
    md.appendMarkdown(`| ATH | ${formatPrice(coin.ath)} (${coin.ath_change_percentage?.toFixed(1) ?? "N/A"}%)\n`);
    md.appendMarkdown(`| ATL | ${formatPrice(coin.atl)} (${coin.atl_change_percentage?.toFixed(1) ?? "N/A"}%)\n`);
    md.appendMarkdown(`| Supply | ${supplyPercentage}%\n`);

    if (coin.sparkline_in_7d?.price) {
      md.appendMarkdown(`\n**7d Trend:** ${formatSparkline(coin.sparkline_in_7d.price)}\n\n`);
    }

    if (coin.total_supply && coin.circulating_supply != null && coin.circulating_supply < coin.total_supply) {
      const locked = coin.total_supply - coin.circulating_supply;
      const lockedPct = ((locked / coin.total_supply) * 100).toFixed(2);
      md.appendMarkdown(`\n---\n\n**Lock-up Info**\n`);
      md.appendMarkdown(`\n- Locked: ${locked?.toLocaleString() ?? "N/A"} ${escapeHtml(coin.symbol.toUpperCase())} (${lockedPct}%)`);
      if (coin.next_unlock_date && coin.next_unlock_amount) {
        md.appendMarkdown(`\n- Next Unlock: ${new Date(coin.next_unlock_date).toLocaleDateString()} — ${coin.next_unlock_amount.toLocaleString()} ${escapeHtml(coin.symbol.toUpperCase())}`);
      }
      if (coin.linear_unlock_info) {
        md.appendMarkdown(`\n- Linear: ${escapeHtml(coin.linear_unlock_info)}`);
      }
    }

    return md;
  }
}

export class StatusItem extends vscode.TreeItem {
  constructor(message: string, icon: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(icon);
    this.contextValue = "statusItem";
  }
}

export class CryptoTreeDataProvider
  implements vscode.TreeDataProvider<CryptoItem | StatusItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    CryptoItem | StatusItem | undefined | null | void
  > = new vscode.EventEmitter<CryptoItem | StatusItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    CryptoItem | StatusItem | undefined | null | void
  > = this._onDidChangeTreeData.event;
  private store: CryptoStore;
  public isLoading: boolean = false;
  public errorMessage: string | null = null;

  constructor() {
    this.store = CryptoStore.getInstance();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CryptoItem | StatusItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: CryptoItem | StatusItem): Promise<Array<CryptoItem | StatusItem>> {
    if (element) {
      return [];
    }

    if (this.isLoading) {
      return [new StatusItem("Loading data...", "loading~spin")];
    }

    if (this.errorMessage) {
      const errItem = new StatusItem(`⚠ ${this.errorMessage}`, "error");
      errItem.command = {
        command: "crypto-price-viewer.refresh",
        title: "Retry",
      };
      errItem.tooltip = new vscode.MarkdownString("Click to retry");
      return [errItem];
    }

    const data = this.store.getFilteredData();
    if (data.length === 0 && this.store.searchTerm) {
      return [new StatusItem(
        `No results for "${this.store.searchTerm}"`,
        "search"
      )];
    }

    return data.map(
      (coin) =>
        new CryptoItem(
          coin,
          vscode.TreeItemCollapsibleState.None,
          this.store.isInWatchlist(coin.id ?? coin.symbol)
        )
    );
  }

  getDetailView(item: CryptoItem): string {
    const coin = item.coin;
    const safeName = escapeHtml(coin.name);
    const safeSymbol = escapeHtml(coin.symbol.toUpperCase());
    const safeImage = encodeURI(coin.image);

    const supplyPercentage = coin.total_supply
      ? ((coin.circulating_supply! / coin.total_supply) * 100).toFixed(2)
      : "N/A";

    const fmt = formatPrice;
    const fmc = formatMarketCap;

    const priceChangeClass = (val: number | null | undefined): string =>
      val != null && val < 0 ? "negative" : "positive";

    const fmtDate = (d: string | null | undefined): string =>
      d ? new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }) : "N/A";

    const sparklineBlock = coin.sparkline_in_7d?.price
      ? `<h2>7 Day Trend</h2>
         <div class="sparkline">${escapeHtml(formatSparkline(coin.sparkline_in_7d.price))}</div>`
      : "";

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName} Details</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0; padding: 20px;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    .container {
      max-width: 800px; margin: 0 auto; padding: 20px;
      background-color: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 8px;
    }
    h1 {
      display: flex; align-items: center; font-size: 24px;
      color: var(--vscode-textLink-foreground);
      border-bottom: 1px solid var(--vscode-editorWidget-border);
      padding-bottom: 15px; margin-top: 0;
    }
    h1 img { width: 32px; height: 32px; margin-right: 12px; border-radius: 50%; }
    h2 {
      font-size: 18px; color: var(--vscode-textLink-activeForeground);
      margin-top: 20px; margin-bottom: 8px;
      border-bottom: 1px solid var(--vscode-editorGroup-border);
      padding-bottom: 6px;
    }
    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 8px;
    }
    .item {
      padding: 8px 12px;
      background-color: var(--vscode-editorWidget-background);
      border-radius: 4px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .item .label { color: var(--vscode-descriptionForeground); font-size: 13px; }
    .item .value { font-weight: 500; text-align: right; }
    .positive { color: var(--vscode-terminal-ansiGreen, #4caf50); }
    .negative { color: var(--vscode-terminal-ansiRed, #f44336); }
    .sparkline {
      font-family: monospace; font-size: 20px; letter-spacing: 1px;
      padding: 12px; background: var(--vscode-editorWidget-background);
      border-radius: 4px; text-align: center;
    }
    .links { margin-top: 16px; text-align: center; }
    .links a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none; padding: 6px 14px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px; margin: 0 4px;
    }
    .links a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1><img src="${safeImage}" alt="${safeName}"> ${safeName} (${safeSymbol})</h1>

    <h2>Price Info</h2>
    <div class="grid">
      <div class="item"><span class="label">Current</span><span class="value">${fmt(coin.current_price)}</span></div>
      <div class="item"><span class="label">24h Change</span><span class="value ${priceChangeClass(coin.price_change_percentage_24h)}">${coin.price_change_percentage_24h?.toFixed(2) ?? "N/A"}%</span></div>
      <div class="item"><span class="label">24h High</span><span class="value">${fmt(coin.high_24h)}</span></div>
      <div class="item"><span class="label">24h Low</span><span class="value">${fmt(coin.low_24h)}</span></div>
      <div class="item"><span class="label">ATH</span><span class="value">${fmt(coin.ath)}</span></div>
      <div class="item"><span class="label">ATH Date</span><span class="value">${fmtDate(coin.ath_date)}</span></div>
      <div class="item"><span class="label">From ATH</span><span class="value ${priceChangeClass(coin.ath_change_percentage)}">${coin.ath_change_percentage?.toFixed(1) ?? "N/A"}%</span></div>
      <div class="item"><span class="label">ATL</span><span class="value">${fmt(coin.atl)}</span></div>
      <div class="item"><span class="label">ATL Date</span><span class="value">${fmtDate(coin.atl_date)}</span></div>
      <div class="item"><span class="label">From ATL</span><span class="value ${priceChangeClass(coin.atl_change_percentage)}">${coin.atl_change_percentage?.toFixed(1) ?? "N/A"}%</span></div>
    </div>

    <h2>Market Info</h2>
    <div class="grid">
      <div class="item"><span class="label">Rank</span><span class="value">#${coin.market_cap_rank ?? "N/A"}</span></div>
      <div class="item"><span class="label">Market Cap</span><span class="value">${fmc(coin.market_cap)}</span></div>
      <div class="item"><span class="label">24h Volume</span><span class="value">${fmc(coin.total_volume)}</span></div>
    </div>

    <h2>Supply Info</h2>
    <div class="grid">
      <div class="item"><span class="label">Circulating</span><span class="value">${coin.circulating_supply?.toLocaleString() ?? "N/A"}</span></div>
      <div class="item"><span class="label">Total Supply</span><span class="value">${coin.total_supply?.toLocaleString() ?? "N/A"}</span></div>
      <div class="item"><span class="label">Max Supply</span><span class="value">${coin.max_supply?.toLocaleString() ?? "N/A"}</span></div>
      <div class="item"><span class="label">Circulation</span><span class="value">${supplyPercentage}%</span></div>
    </div>

    ${sparklineBlock}

    <div class="links">
      <a href="https://www.coingecko.com/en/coins/${escapeHtml(coin.id ?? '')}">View on CoinGecko</a>
      <a href="https://www.binance.com/en/trade/${safeSymbol}_USDT">View on Binance</a>
    </div>
  </div>
</body>
</html>`;
  }
}
