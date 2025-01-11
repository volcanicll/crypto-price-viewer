import * as vscode from "vscode";
import { CryptoStore } from "../store/CryptoStore";

export class CryptoItem extends vscode.TreeItem {
  constructor(
    public readonly coin: any,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(coin.name, collapsibleState);

    // 格式化市值
    const formatMarketCap = (value: number) => {
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
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
    const priceChange = coin.price_change_percentage_24h.toFixed(2);
    const changeSymbol = coin.price_change_percentage_24h >= 0 ? "↑" : "↓";
    const changeColor =
      coin.price_change_percentage_24h >= 0 ? "$(arrow-up)" : "$(arrow-down)";
    this.description = `$${coin.current_price.toLocaleString()} | ${changeSymbol} ${Math.abs(
      priceChange
    )}% `;

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
      unlockInfo += `\n- 锁仓数量: ${lockedSupply.toLocaleString()} ${coin.symbol.toUpperCase()}`;
      unlockInfo += `\n- 锁仓比例: ${lockedPercentage}%`;

      // 如果有下次解锁信息
      if (coin.next_unlock_date && coin.next_unlock_amount) {
        const unlockDate = new Date(coin.next_unlock_date);
        const formattedDate = unlockDate.toLocaleDateString("zh-CN");
        unlockInfo += `\n- 下次解锁时间: ${formattedDate}`;
        unlockInfo += `\n- 下次解锁数量: ${coin.next_unlock_amount.toLocaleString()} ${coin.symbol.toUpperCase()}`;
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
- 市值排名: #${coin.market_cap_rank}
- 当前价格: $${coin.current_price.toLocaleString()}
- 市值: ${formatMarketCap(coin.market_cap)}
- 24h涨跌幅: ${priceChange}%
- 24h交易量: ${formatMarketCap(coin.total_volume)}

**供应信息**
- 流通量: ${coin.circulating_supply.toLocaleString()}
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

    return `
# ${coin.name} (${coin.symbol.toUpperCase()})

## 价格信息
- 当前价格: $${coin.current_price.toLocaleString()}
- 24h涨跌幅: ${coin.price_change_percentage_24h.toFixed(2)}%

## 市场信息
- 市值排名: #${coin.market_cap_rank}
- 市值: $${(coin.market_cap / 1e9).toFixed(2)}B
- 24h交易量: $${(coin.total_volume / 1e6).toFixed(2)}M

## 供应信息
- 流通量: ${coin.circulating_supply.toLocaleString()}
- 总供应量: ${coin.total_supply ? coin.total_supply.toLocaleString() : "N/A"}
- 供应量占比: ${supplyPercentage}%
    `;
  }
}
