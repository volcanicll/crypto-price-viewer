import * as vscode from "vscode";
import {
  CryptoTreeDataProvider,
  CryptoItem,
  StatusItem,
} from "./provider/CryptoTreeDataProvider";
import { CryptoStore } from "./store/CryptoStore";
import { fetchCryptoData } from "./services/cryptoService";

let treeDataProvider: CryptoTreeDataProvider;
let autoRefreshTimer: NodeJS.Timeout | undefined;
let statusBarItem: vscode.StatusBarItem;
let detailPanel: vscode.WebviewPanel | undefined;
let extensionContext: vscode.ExtensionContext;
let isFirstLoad: boolean = true;

export async function activate(context: vscode.ExtensionContext) {
  const store = CryptoStore.getInstance();
  extensionContext = context;
  treeDataProvider = new CryptoTreeDataProvider();

  // Load persisted watchlist
  const savedWatchlist = context.globalState.get<string[]>("watchlist", []);
  store.loadWatchlist(savedWatchlist);

  // Status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "crypto-price-viewer.refresh";
  statusBarItem.tooltip = "Crypto Price Viewer — click to refresh";
  statusBarItem.text = "$(crypto) Loading...";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // TreeView
  const treeView = vscode.window.createTreeView("cryptoPriceView", {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true,
  });

  treeView.onDidChangeVisibility((e) => {
    if (e.visible) {
      updateTreeViewTitle(treeView, store);
    }
  });

  // --- Commands ---

  context.subscriptions.push(
    // Refresh
    vscode.commands.registerCommand("crypto-price-viewer.refresh", async () => {
      await refreshData(store, treeView);
    }),

    // Search
    vscode.commands.registerCommand("crypto-price-viewer.search", async () => {
      const searchTerm = await vscode.window.showInputBox({
        placeHolder: "Search by name or symbol...",
        value: store.searchTerm,
        prompt: "Press Enter to search, Esc to cancel",
      });
      if (searchTerm !== undefined) {
        store.searchTerm = searchTerm;
        treeDataProvider.refresh();
        updateTreeViewTitle(treeView, store);
      }
    }),

    // Clear search
    vscode.commands.registerCommand("crypto-price-viewer.clearSearch", () => {
      store.clearSearch();
      treeDataProvider.refresh();
      updateTreeViewTitle(treeView, store);
    }),

    // Show detail (reuses panel)
    vscode.commands.registerCommand(
      "crypto-price-viewer.showDetail",
      (item: CryptoItem) => {
        if (detailPanel) {
          detailPanel.title = `${item.coin.name} Details`;
          detailPanel.webview.html = treeDataProvider.getDetailView(item);
          detailPanel.reveal(vscode.ViewColumn.Beside);
        } else {
          detailPanel = vscode.window.createWebviewPanel(
            "cryptoDetail",
            `${item.coin.name} Details`,
            vscode.ViewColumn.Beside,
            { enableScripts: false }
          );
          detailPanel.webview.html = treeDataProvider.getDetailView(item);
          detailPanel.onDidDispose(() => {
            detailPanel = undefined;
          });
        }
      }
    ),

    // Sort by market cap
    vscode.commands.registerCommand(
      "crypto-price-viewer.sort.marketCap",
      () => {
        store.sortBy("market_cap");
        treeDataProvider.refresh();
        const dir = store.sortDirection === "asc" ? "↑" : "↓";
        vscode.window.showInformationMessage(
          `Sorted by Market Cap ${dir}`
        );
      }
    ),

    // Sort by price change
    vscode.commands.registerCommand(
      "crypto-price-viewer.sort.priceChange",
      () => {
        store.sortBy("price_change_percentage_24h");
        treeDataProvider.refresh();
        const dir = store.sortDirection === "asc" ? "↑" : "↓";
        vscode.window.showInformationMessage(
          `Sorted by 24h Change ${dir}`
        );
      }
    ),

    // Watchlist add/remove
    vscode.commands.registerCommand(
      "crypto-price-viewer.toggleWatchlist",
      (item: CryptoItem) => {
        store.toggleWatchlist(item.coinId);
        context.globalState.update("watchlist", store.getWatchlistIds());
        treeDataProvider.refresh();
        const inList = store.isInWatchlist(item.coinId);
        vscode.window.showInformationMessage(
          `${inList ? "Added" : "Removed"} ${item.coin.name} ${inList ? "to" : "from"} watchlist`
        );
      }
    ),

    // Set price alert
    vscode.commands.registerCommand(
      "crypto-price-viewer.setAlert",
      async (item: CryptoItem) => {
        const input = await vscode.window.showInputBox({
          placeHolder: "Target price (e.g. 50000)",
          prompt: `Set alert for ${item.coin.name} (${item.coin.symbol.toUpperCase()})`,
          validateInput: (v) => {
            const n = parseFloat(v);
            if (isNaN(n) || n <= 0) return "Enter a valid positive number";
            return undefined;
          },
        });
        if (!input) return;

        const target = parseFloat(input);
        const currentPrice = item.coin.current_price ?? 0;
        const direction = target >= currentPrice ? "above" : "below";

        const alerts = context.globalState.get<
          Record<string, { target: number; direction: "above" | "below" }>[]
        >("priceAlerts", []);

        alerts.push({ [item.coinId]: { target, direction } });
        await context.globalState.update("priceAlerts", alerts);

        vscode.window.showInformationMessage(
          `Alert set: ${item.coin.name} ${direction} $${target.toLocaleString()}`
        );
      }
    ),

    // Manage alerts
    vscode.commands.registerCommand(
      "crypto-price-viewer.manageAlerts",
      async () => {
        const alerts = context.globalState.get<
          Record<string, { target: number; direction: "above" | "below" }>[]
        >("priceAlerts", []);

        if (alerts.length === 0) {
          vscode.window.showInformationMessage("No active price alerts");
          return;
        }

        const items = alerts.map((a, i) => {
          const [coinId, info] = Object.entries(a)[0];
          return {
            label: `${coinId.toUpperCase()} ${info.direction} $${info.target.toLocaleString()}`,
            description: `#${i}`,
            index: i,
          };
        });

        const picked = await vscode.window.showQuickPick(items, {
          placeHolder: "Select an alert to remove",
          canPickMany: true,
        });

        if (picked && picked.length > 0) {
          const indicesToRemove = new Set(picked.map((p) => p.index));
          const remaining = alerts.filter((_, i) => !indicesToRemove.has(i));
          await context.globalState.update("priceAlerts", remaining);
          vscode.window.showInformationMessage(
            `Removed ${picked.length} alert(s)`
          );
        }
      }
    )
  );

  // Auto-refresh setup
  setupAutoRefresh(store, treeView, context);

  // Listen for config changes
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("cryptoPriceViewer")) {
      setupAutoRefresh(store, treeView, context);
      if (e.affectsConfiguration("cryptoPriceViewer.currency") ||
          e.affectsConfiguration("cryptoPriceViewer.defaultLimit") ||
          e.affectsConfiguration("cryptoPriceViewer.preferredDataSource")) {
        refreshData(store, treeView);
      }
    }
  });

  // Initial load
  await refreshData(store, treeView);
}

async function refreshData(
  store: CryptoStore,
  treeView: vscode.TreeView<CryptoItem | StatusItem>
) {
  // 首次加载显示 loading；后续静默刷新，保留旧数据不闪烁
  if (isFirstLoad) {
    treeDataProvider.isLoading = true;
    treeDataProvider.errorMessage = null;
    treeDataProvider.refresh();
  }

  try {
    const data = await fetchCryptoData(store);
    if (data) {
      store.cryptoData = data;
      treeDataProvider.isLoading = false;
      treeDataProvider.errorMessage = null;
      treeDataProvider.refresh();
      updateTreeViewTitle(treeView, store);
      updateStatusBar(store);
      isFirstLoad = false;
      checkPriceAlerts(store);
    }
  } catch (error) {
    treeDataProvider.isLoading = false;
    treeDataProvider.errorMessage = error instanceof Error ? error.message : String(error);
    treeDataProvider.refresh();
    updateStatusBarError();
    isFirstLoad = false;
  }
}

function setupAutoRefresh(
  store: CryptoStore,
  treeView: vscode.TreeView<CryptoItem | StatusItem>,
  context: vscode.ExtensionContext
) {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = undefined;
  }

  const interval = store.refreshInterval;
  if (interval > 0) {
    autoRefreshTimer = setInterval(async () => {
      await refreshData(store, treeView);
    }, interval * 1000);
  }
}

function updateTreeViewTitle(
  treeView: vscode.TreeView<CryptoItem | StatusItem>,
  store: CryptoStore
) {
  const searchInfo = store.searchTerm
    ? ` — "${store.searchTerm}" (${store.totalFiltered}/${store.totalCoins})`
    : "";
  const sortInfo = store.sortField
    ? ` [${store.sortField === "market_cap" ? "MCap" : "24h"} ${store.sortDirection === "asc" ? "↑" : "↓"}]`
    : "";
  treeView.title = `Crypto Prices${sortInfo}${searchInfo}`;
}

function updateStatusBar(store: CryptoStore) {
  const src = store.dataSource ? ` · ${store.dataSource}` : "";
  const time = store.lastUpdated
    ? store.lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  statusBarItem.text = `$(crypto) ${time}${src}`;
  statusBarItem.tooltip = `Last updated: ${time}\nSource: ${store.dataSource || "N/A"}\nClick to refresh`;
}

function updateStatusBarError() {
  statusBarItem.text = "$(crypto) ⚠ Error";
  statusBarItem.tooltip = "Failed to fetch data — click to retry";
}

function checkPriceAlerts(store: CryptoStore) {
  const ctx = extensionContext;
  if (!ctx) return;

  const alerts = ctx.globalState.get<
    Record<string, { target: number; direction: "above" | "below" }>[]
  >("priceAlerts", []);

  if (alerts.length === 0) return;

  const triggered: number[] = [];

  alerts.forEach((alert, index) => {
    const [coinId, info] = Object.entries(alert)[0];
    const coin = store.cryptoData.find(
      (c) => (c.id ?? c.symbol) === coinId
    );
    if (!coin || coin.current_price == null) return;

    const hit =
      (info.direction === "above" && coin.current_price >= info.target) ||
      (info.direction === "below" && coin.current_price <= info.target);

    if (hit) {
      triggered.push(index);
      vscode.window.showWarningMessage(
        `${coin.name} (${coin.symbol.toUpperCase()}) is ${info.direction} $${info.target.toLocaleString()}! Current: $${coin.current_price.toLocaleString()}`
      );
    }
  });

  if (triggered.length > 0) {
    const remaining = alerts.filter((_, i) => !triggered.includes(i));
    ctx.globalState.update("priceAlerts", remaining);
  }
}

export function deactivate() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }
  if (detailPanel) {
    detailPanel.dispose();
  }
}
