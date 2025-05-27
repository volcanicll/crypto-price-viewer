import * as vscode from "vscode";
import { CryptoStore } from "../store/CryptoStore";

export class CryptoItem extends vscode.TreeItem {
  constructor(
    public readonly coin: any,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(coin.name, collapsibleState);

    // 格式化市值
    const formatMarketCap = (value: number | null | undefined) => {
      if (value == null) {
        return "N/A";
      }
      if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
      }
      if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
      }
      return `$${value.toLocaleString()}`;
    };

    // 计算供应量占比
    const supplyPercentage = coin.total_supply
      ? ((coin.circulating_supply / coin.total_supply) * 100).toFixed(2)
      : "N/A";

    // 设置图标
    this.iconPath = {
      light: vscode.Uri.parse(coin.image),
      dark: vscode.Uri.parse(coin.image),
    };

    // 设置主要显示内容
    this.label = `${coin.name} (${coin.symbol.toUpperCase()})`;

    // 设置描述信息（价格和涨跌幅）
    const priceChange =
      coin.price_change_percentage_24h != null
        ? coin.price_change_percentage_24h.toFixed(2)
        : "0.00";
    const changeSymbol =
      (coin.price_change_percentage_24h ?? 0) >= 0 ? "↑" : "↓";
    const changeColor =
      (coin.price_change_percentage_24h ?? 0) >= 0
        ? "$(arrow-up)"
        : "$(arrow-down)";
    this.description = `$${
      coin.current_price?.toLocaleString() ?? "N/A"
    } | ${changeSymbol} ${Math.abs(parseFloat(priceChange))}% `;

    // 计算解锁信息
    const getUnlockInfo = (coin: any) => {
      if (!coin.total_supply || coin.circulating_supply >= coin.total_supply) {
        return "";
      }

      const lockedSupply = coin.total_supply - coin.circulating_supply;
      const lockedPercentage = (
        (lockedSupply / coin.total_supply) *
        100
      ).toFixed(2);

      let unlockInfo = `\n\n**锁仓信息**`;
      unlockInfo += `\n- 锁仓数量: ${
        lockedSupply?.toLocaleString() ?? "N/A"
      } ${coin.symbol.toUpperCase()}`;
      unlockInfo += `\n- 锁仓比例: ${lockedPercentage}%`;

      // 如果有下次解锁信息
      if (coin.next_unlock_date && coin.next_unlock_amount) {
        const unlockDate = new Date(coin.next_unlock_date);
        const formattedDate = unlockDate.toLocaleDateString("zh-CN");
        unlockInfo += `\n- 下次解锁时间: ${formattedDate}`;
        unlockInfo += `\n- 下次解锁数量: ${
          coin.next_unlock_amount?.toLocaleString() ?? "N/A"
        } ${coin.symbol.toUpperCase()}`;
        unlockInfo += `\n- 解锁比例: ${(
          (coin.next_unlock_amount / coin.total_supply) *
          100
        ).toFixed(2)}%`;
      }

      // 如果有线性解锁信息
      if (coin.linear_unlock_info) {
        unlockInfo += `\n- 线性解锁: ${coin.linear_unlock_info}`;
      }

      // 如果有锁仓合约地址
      if (coin.lock_contract_address) {
        unlockInfo += `\n- 锁仓合约: [查看合约](${coin.lock_contract_address})`;
      }

      return unlockInfo;
    };

    // 设置悬停提示，添加解锁信息
    this.tooltip = new vscode.MarkdownString(`
### ${coin.name} (${coin.symbol.toUpperCase()})
- 市值排名: #${coin.market_cap_rank ?? "N/A"}
- 当前价格: $${coin.current_price?.toLocaleString() ?? "N/A"}
- 历史最高价 (ATH): $${coin.ath?.toLocaleString() ?? "N/A"}
- 历史最低价 (ATL): $${coin.atl?.toLocaleString() ?? "N/A"}
- 市值: ${formatMarketCap(coin.market_cap)}
- 24h涨跌幅: ${priceChange}%
- 24h交易量: ${formatMarketCap(coin.total_volume)}

**供应信息**
- 流通量: ${coin.circulating_supply?.toLocaleString() ?? "N/A"}
- 总供应量: ${coin.total_supply ? coin.total_supply.toLocaleString() : "N/A"}
- 供应量占比: ${supplyPercentage}%${getUnlockInfo(coin)}
    `);

    // 启用 Markdown 字符串中的链接
    this.tooltip.isTrusted = true;
    this.tooltip.supportHtml = true;

    // 设置上下文值，用于命令调用
    this.contextValue = "cryptoItem";

    // 设置命令（点击时触发）
    this.command = {
      command: "crypto-price-viewer.showDetail",
      title: "Show Details",
      arguments: [this],
    };
  }
}

export class CryptoTreeDataProvider
  implements vscode.TreeDataProvider<CryptoItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    CryptoItem | undefined | null | void
  > = new vscode.EventEmitter<CryptoItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    CryptoItem | undefined | null | void
  > = this._onDidChangeTreeData.event;
  private store: CryptoStore;

  constructor() {
    this.store = CryptoStore.getInstance();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CryptoItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: CryptoItem): Promise<CryptoItem[]> {
    if (element) {
      // 如果需要显示子项，在这里处理
      return [];
    }

    const data = this.store.getFilteredData();
    return data.map(
      (coin) => new CryptoItem(coin, vscode.TreeItemCollapsibleState.None)
    );
  }

  // 添加详细信息视图
  getDetailView(item: CryptoItem): string {
    const coin = item.coin;
    const supplyPercentage = coin.total_supply
      ? ((coin.circulating_supply / coin.total_supply) * 100).toFixed(2)
      : "N/A";

    const formatPrice = (price: number | null | undefined): string => {
      return price?.toLocaleString() ?? "N/A";
    };

    const formatMarketCapDetail = (
      value: number | null | undefined
    ): string => {
      if (value == null) {
        return "N/A";
      }
      if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
      }
      if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
      }
      return `$${value.toLocaleString()}`;
    };

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${coin.name} 详细信息</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
        }
        h1 {
            display: flex;
            align-items: center;
            font-size: 24px;
            color: var(--vscode-textLink-foreground);
            border-bottom: 1px solid var(--vscode-editorWidget-border);
            padding-bottom: 15px;
            margin-top: 0;
        }
        h1 img {
            width: 32px;
            height: 32px;
            margin-right: 12px;
            border-radius: 50%;
        }
        h2 {
            font-size: 20px;
            color: var(--vscode-textLink-activeForeground);
            margin-top: 25px;
            margin-bottom: 10px;
            border-bottom: 1px solid var(--vscode-editorGroup-border);
            padding-bottom: 8px;
        }
        ul {
            list-style-type: none;
            padding-left: 0;
        }
        li {
            margin-bottom: 10px;
            padding: 8px;
            background-color: var(--vscode-editorWidget-background);
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        li strong {
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
            margin-right: 10px;
        }
        .value {
            color: var(--vscode-editor-foreground);
            text-align: right;
        }
        .positive {
            color: var(--vscode-terminal-ansiGreen);
        }
        .negative {
            color: var(--vscode-terminal-ansiRed);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1><img src="${coin.image}" alt="${coin.name} logo"> ${
      coin.name
    } (${coin.symbol.toUpperCase()})</h1>

        <h2>价格信息</h2>
        <ul>
            <li><strong>当前价格:</strong> <span class="value">$${formatPrice(
              coin.current_price
            )}</span></li>
            <li><strong>历史最高价 (ATH):</strong> <span class="value">$${formatPrice(
              coin.ath
            )}</span></li>
            <li><strong>ATH 日期:</strong> <span class="value">${
              coin.ath_date
                ? new Date(coin.ath_date).toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "N/A"
            }</span></li>
            <li><strong>距离 ATH:</strong> <span class="value ${
              coin.ath_change_percentage != null &&
              coin.ath_change_percentage < 0
                ? "negative"
                : "positive"
            }">${coin.ath_change_percentage?.toFixed(2) ?? "N/A"}%</span></li>
            <li><strong>历史最低价 (ATL):</strong> <span class="value">$${formatPrice(
              coin.atl
            )}</span></li>
            <li><strong>ATL 日期:</strong> <span class="value">${
              coin.atl_date
                ? new Date(coin.atl_date).toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "N/A"
            }</span></li>
            <li><strong>距离 ATL:</strong> <span class="value ${
              coin.atl_change_percentage != null &&
              coin.atl_change_percentage < 0
                ? "negative"
                : "positive"
            }">${coin.atl_change_percentage?.toFixed(2) ?? "N/A"}%</span></li>
            <li><strong>24h 涨跌幅:</strong> <span class="value ${
              coin.price_change_percentage_24h != null &&
              coin.price_change_percentage_24h < 0
                ? "negative"
                : "positive"
            }">${
      coin.price_change_percentage_24h != null
        ? coin.price_change_percentage_24h.toFixed(2)
        : "N/A"
    }%</span></li>
        </ul>

        <h2>市场信息</h2>
        <ul>
            <li><strong>市值排名:</strong> <span class="value">#${
              coin.market_cap_rank ?? "N/A"
            }</span></li>
            <li><strong>市值:</strong> <span class="value">${formatMarketCapDetail(
              coin.market_cap
            )}</span></li>
            <li><strong>24h 高点:</strong> <span class="value">$${formatPrice(
              coin.high_24h
            )}</span></li>
            <li><strong>24h 低点:</strong> <span class="value">$${formatPrice(
              coin.low_24h
            )}</span></li>
            <li><strong>24h 交易量:</strong> <span class="value">${formatMarketCapDetail(
              coin.total_volume
            )}</span></li>
        </ul>

        <h2>供应信息</h2>
        <ul>
            <li><strong>流通量:</strong> <span class="value">${
              coin.circulating_supply?.toLocaleString() ?? "N/A"
            } ${coin.symbol.toUpperCase()}</span></li>
            <li><strong>总供应量:</strong> <span class="value">${
              coin.total_supply ? coin.total_supply.toLocaleString() : "N/A"
            } ${coin.symbol.toUpperCase()}</span></li>
            <li><strong>最大供应量:</strong> <span class="value">${
              coin.max_supply ? coin.max_supply.toLocaleString() : "N/A"
            } ${coin.symbol.toUpperCase()}</span></li>
            <li><strong>供应量占比:</strong> <span class="value">${supplyPercentage}%</span></li>
        </ul>
    </div>
</body>
</html>
    `;
  }
}
