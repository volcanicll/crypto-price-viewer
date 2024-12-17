import * as vscode from "vscode";
import axios from "axios";

let sidebarProvider: CryptoViewProvider | undefined;

class CryptoViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _cryptoData: any[] = [];
  private _searchTerm: string = "";
  private _limit: number = 200; // 添加新属性来存储限制数量
  private _cachedHtml: string | undefined; // 添加缓存属性

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // 检查是否有缓存的 HTML 内容
    if (!this._cachedHtml) {
      this._cachedHtml = this._getHtmlForWebview(); // 生成并缓存 HTML
    }
    webviewView.webview.html = this._cachedHtml; // 使用缓存的 HTML
    await this.updatePrices();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "search":
          this._searchTerm = data.value.toLowerCase();
          this._updateView();
          break;
        case "refresh":
          await this.updatePrices();
          break;
        case "changeLimit": // 添加新的消息类型
          this._limit = parseInt(data.value);
          await this.updatePrices();
          break;
      }
    });

    // Auto refresh every 30 seconds
    setInterval(async () => {
      await this.updatePrices();
    }, 30000);
  }

  private async updatePrices() {
    const loadingElement = this._view?.webview.html.includes("loading")
      ? "loading"
      : null; // 获取加载元素的 ID
    if (loadingElement) {
      this._view?.webview.postMessage({ type: "showLoading" }); // 显示加载指示器
    }

    try {
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/coins/markets",
        {
          params: {
            vs_currency: "usd",
            order: "market_cap_desc",
            per_page: this._limit,
            page: 1,
            sparkline: false,
          },
        }
      );
      this._cryptoData = response.data;
      this._updateView();
    } catch (error) {
      vscode.window.showErrorMessage("Failed to fetch cryptocurrency prices");
    } finally {
      if (loadingElement) {
        this._view?.webview.postMessage({ type: "hideLoading" }); // 隐藏加载指示器
      }
    }
  }

  private _updateView() {
    if (this._view) {
      const filteredData = this._cryptoData.filter(
        (coin) =>
          coin.name.toLowerCase().includes(this._searchTerm) ||
          coin.symbol.toLowerCase().includes(this._searchTerm)
      );
      this._view.webview.postMessage({
        type: "update",
        data: filteredData,
      });
    }
  }

  private _getHtmlForWebview() {
    return `<!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            padding: 8px;
            min-width: 200px;
          }
          .search-container {
            position: sticky;
            top: 0;
            background-color: var(--vscode-editor-background);
            padding: 8px 0;
            margin-bottom: 8px;
            z-index: 100;
          }
          .controls-row {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 8px;
          }
          .search-row {
            display: flex;
            gap: 6px;
            align-items: center;
          }
          #searchInput {
            flex: 1;
            padding: 4px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            height: 24px;
            min-width: 120px;
          }
          .limit-select {
            background: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            padding: 2px 6px;
            height: 24px;
            min-width: 40px;
            flex: 0 0 auto;
          }
          .button {
            height: 24px;
            padding: 0 8px;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
            font-size: 12px;
            border-radius: 3px;
            flex: 0 0 auto;
          }
          .sort-button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          .sort-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }
          .sort-button.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }
          .refresh-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }
          .refresh-button:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .crypto-item {
            display: flex;
            padding: 6px;
            border-bottom: 1px solid var(--vscode-list-inactiveSelectionBackground);
            align-items: center;
          }
          .rank-number {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            width: 24px;
            text-align: right;
            padding-right: 6px;
          }
          .crypto-icon {
            width: 20px;
            height: 20px;
            margin-right: 8px;
          }
          .crypto-info {
            flex: 1;
            min-width: 0;
          }
          .crypto-name {
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .crypto-symbol {
            color: var(--vscode-descriptionForeground);
            margin-left: 4px;
            font-size: 11px;
          }
          .crypto-price {
            margin-top: 2px;
            font-size: 12px;
            display: flex;
            gap: 6px;
            align-items: center;
            flex-wrap: wrap;
          }
          .positive {
            color: #4caf50;
          }
          .negative {
            color: #f44336;
          }
          .market-cap {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
          }

          .tooltip {
            position: relative;
            display: inline-block;
          }
          .tooltip .tooltiptext {
            visibility: hidden;
            width: 120px;
            background-color: black;
            color: #fff;
            text-align: center;
            border-radius: 5px;
            padding: 5px;
            position: absolute;
            z-index: 1;
            bottom: 125%; /* Position above the icon */
            left: 50%;
            margin-left: -60px; /* Center the tooltip */
            opacity: 0;
            transition: opacity 0.3s;
          }
          .tooltip:hover .tooltiptext {
            visibility: visible;
            opacity: 1;
          }

          @media (max-width: 300px) {
            .controls-row {
              flex-direction: column;
              align-items: stretch;
            }
            .button, .limit-select {
              width: 100%;
            }
          }

          .supply-info {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
          }
          .supply-percentage, .trading-volume {
            flex: 1;
            text-align: left;
          }

          .skeleton {
            background: linear-gradient(90deg, #2c3e50 25%, #34495e 50%, #2c3e50 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 4px; /* 添加圆角 */
          }

          @keyframes loading {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: 0 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="search-container">
          <div class="controls-row">
            <select class="limit-select button" onchange="changeLimit(this.value)">
              <option value="100">Top 100</option>
              <option value="200" selected>Top 200</option>
              <option value="500">Top 500</option>
            </select>
            <button class="sort-button button" onclick="sortBy('marketCap', this)" data-sort="marketCap">市值</button>
            <button class="sort-button button" onclick="sortBy('change', this)" data-sort="change">涨跌幅</button>
            <button class="refresh-button button" onclick="refresh()">刷新</button>
          </div>
          <div class="search-row">
            <input type="text" id="searchInput" placeholder="搜索币名或代号...">
          </div>
        </div>
        <div id="loading" style="display: none;">
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 20px; margin-bottom: 8px;"></div>
        </div>
        <div id="cryptoList"></div>
        <script>
          (function() {
            const vscode = acquireVsCodeApi();
            let timeout = null;
            let cryptoData = [];
            let currentSort = { field: 'marketCap', ascending: false };

            function formatMarketCap(marketCap) {
              if (marketCap >= 1e9) {
                return '$ ' + (marketCap / 1e9).toFixed(2) + 'B';
              } else if (marketCap >= 1e6) {
                return '$ ' + (marketCap / 1e6).toFixed(2) + 'M';
              } else {
                return '$ ' + marketCap.toLocaleString();
              }
            }

            function renderCryptoList(data) {
              const listElement = document.getElementById('cryptoList');
              if (!listElement) return;

              const html = data.map((coin, index) => {
               const supplyPercentage = ((coin.circulating_supply / coin.total_supply) * 100).toFixed(2);
                return \`
                  <div class="crypto-item">
                    <span class="rank-number">#\${coin.market_cap_rank}</span>
                    <div class="tooltip">
                      <img src="\${coin.image}" class="crypto-icon" alt="\${coin.name}">
                      <span class="tooltiptext">\${coin.description || '无描述'}</span>
                    </div>
                    <div class="crypto-info">
                      <div>
                        <span class="crypto-name">\${coin.name}</span>
                        <span class="crypto-symbol">\${coin.symbol.toUpperCase()}</span>
                      </div>
                      <div class="crypto-price">
                        $\${coin.current_price.toLocaleString()}
                        <span class="\${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">
                          \${coin.price_change_percentage_24h.toFixed(2)}%
                        </span>
                        <span class="market-cap">市值: \${formatMarketCap(coin.market_cap)}</span>
                      </div>
                       <div class="supply-info">
                        <span class="supply-percentage">已供应量占比: \${supplyPercentage}%</span>
                        <span class="trading-volume">24小时交易量: $\${coin.total_volume.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                \`;
              }).join('');

              listElement.innerHTML = html;
            }

            document.getElementById('searchInput').addEventListener('input', (e) => {
              if (timeout) {
                clearTimeout(timeout);
              }
              timeout = setTimeout(() => {
                vscode.postMessage({ type: 'search', value: e.target.value });
              }, 300);
            });

            function refresh() {
              vscode.postMessage({ type: 'refresh' });
            }

            function sortBy(field, button) {
              const buttons = document.querySelectorAll('.sort-button');
              buttons.forEach(btn => btn.classList.remove('active'));
              button.classList.add('active');

              if (currentSort.field === field) {
                currentSort.ascending = !currentSort.ascending;
              } else {
                currentSort.field = field;
                currentSort.ascending = true;
              }

              sortAndUpdateList();
            }

            function sortAndUpdateList() {
              const sortedData = [...cryptoData].sort((a, b) => {
                let valueA, valueB;

                if (currentSort.field === 'change') {
                  valueA = a.price_change_percentage_24h || 0;
                  valueB = b.price_change_percentage_24h || 0;
                } else if (currentSort.field === 'marketCap') {
                  valueA = a.market_cap || 0;
                  valueB = b.market_cap || 0;
                }

                return currentSort.ascending ? valueA - valueB : valueB - valueA;
              });

              renderCryptoList(sortedData);
            }


              // 添加 changeLimit 函数
            function changeLimit(value) {
              vscode.postMessage({
                type: 'changeLimit',
                value: value
              });
            }

            // 将 changeLimit 添加到全局作用域
            window.changeLimit = changeLimit;


            window.addEventListener('message', event => {
              const message = event.data;
              switch (message.type) {
                case 'update':
                  cryptoData = message.data;
                  sortAndUpdateList();
                  break;
                case 'showLoading': // 显示骨架屏
                  document.getElementById('loading').style.display = 'block';
                  document.getElementById('cryptoList').style.display = 'none'; // 隐藏实际内容
                  break;
                case 'hideLoading': // 隐藏骨架屏
                  document.getElementById('loading').style.display = 'none';
                  document.getElementById('cryptoList').style.display = 'block'; // 显示实际内容
                  break;
              }
            });

            // Make functions globally available
            window.refresh = refresh;
            window.sortBy = sortBy;
          })();
        </script>
      </body>
    </html>`;
  }

  public postMessage(message: any) {
    this._view?.webview.postMessage(message);
  }
}

export function activate(context: vscode.ExtensionContext) {
  sidebarProvider = new CryptoViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "cryptoPriceView",
      sidebarProvider
    )
  );

  let searchDisposable = vscode.commands.registerCommand(
    "crypto-price-viewer.search",
    async () => {
      const searchTerm = await vscode.window.showInputBox({
        placeHolder: "输入要搜索的加密货币名称或符号",
      });
      if (searchTerm && sidebarProvider) {
        vscode.commands.executeCommand(
          "workbench.view.extension.crypto-explorer"
        );
        sidebarProvider.postMessage({
          type: "search",
          value: searchTerm,
        });
      }
    }
  );

  context.subscriptions.push(searchDisposable);
}

export function deactivate() {}
