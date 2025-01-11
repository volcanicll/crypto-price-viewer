export function getHtmlContent(): string {
  return `<!DOCTYPE html>
    <html>
      <head>
        <style>
          body { padding: 8px; min-width: 200px; }
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
            min-width: 80px;
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
          .positive { color: #4caf50; }
          .negative { color: #f44336; }
          .market-cap {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
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
          .tooltip {
            position: relative;
            display: inline-block;
          }
          .tooltip .tooltiptext {
            visibility: hidden;
            width: 200px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            text-align: center;
            border-radius: 4px;
            padding: 8px;
            position: absolute;
            z-index: 1;
            bottom: 125%;
            left: 50%;
            margin-left: -100px;
            opacity: 0;
            transition: opacity 0.3s;
            border: 1px solid var(--vscode-input-border);
            font-size: 11px;
          }
          .tooltip:hover .tooltiptext {
            visibility: visible;
            opacity: 1;
          }
          .supply-info {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
          }
          .supply-percentage, .trading-volume {
            flex: 1;
            text-align: left;
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
        </div>
        <div id="cryptoList"></div>
        <script>
          (function() {
            const vscode = acquireVsCodeApi();
            let cryptoData = [];
            let currentSort = { field: 'marketCap', ascending: false };

            function refresh() {
              document.getElementById('error-message')?.remove();
              document.getElementById('loading').style.display = 'block';
              document.getElementById('cryptoList').style.display = 'none';
              vscode.postMessage({ type: 'refresh' });
            }

            document.getElementById('searchInput').addEventListener('input', (e) => {
              vscode.postMessage({ type: 'search', value: e.target.value });
            });

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

            function changeLimit(value) {
              vscode.postMessage({ type: 'changeLimit', value: value });
            }

            function formatMarketCap(marketCap) {
              if (marketCap >= 1e9) return \`$\${(marketCap / 1e9).toFixed(2)}B\`;
              if (marketCap >= 1e6) return \`$\${(marketCap / 1e6).toFixed(2)}M\`;
              return \`$\${marketCap.toLocaleString()}\`;
            }

            function renderCryptoList(data) {
              const listElement = document.getElementById('cryptoList');
              if (!listElement) return;

              listElement.innerHTML = data.map((coin, index) => {
                const supplyPercentage = coin.total_supply
                  ? ((coin.circulating_supply / coin.total_supply) * 100).toFixed(2)
                  : 'N/A';

                return \`
                  <div class="crypto-item">
                    <span class="rank-number">#\${coin.market_cap_rank}</span>
                    <div class="tooltip">
                      <img src="\${coin.image}" class="crypto-icon" alt="\${coin.name}">
                      <span class="tooltiptext">\${coin.name} (\${coin.symbol.toUpperCase()})</span>
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
                        <span class="trading-volume">24h交易量: \${formatMarketCap(coin.total_volume)}</span>
                      </div>
                    </div>
                  </div>
                \`;
              }).join('');
            }

            window.addEventListener('message', event => {
              const message = event.data;
              switch (message.type) {
                case 'update':
                  cryptoData = message.data;
                  sortAndUpdateList();
                  break;
                case 'showLoading':
                  document.getElementById('loading').style.display = 'block';
                  document.getElementById('cryptoList').style.display = 'none';
                  break;
                case 'hideLoading':
                  document.getElementById('loading').style.display = 'none';
                  document.getElementById('cryptoList').style.display = 'block';
                  break;
              }
            });

            window.refresh = refresh;
            window.sortBy = sortBy;
            window.changeLimit = changeLimit;
          })();
        </script>
      </body>
    </html>`;
}
