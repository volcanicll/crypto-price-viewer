import * as vscode from "vscode";
import {
  CryptoTreeDataProvider,
  CryptoItem,
} from "./provider/CryptoTreeDataProvider";
import { CryptoStore } from "./store/CryptoStore";
import { fetchCryptoData } from "./services/cryptoService";

let treeDataProvider: CryptoTreeDataProvider;

export function activate(context: vscode.ExtensionContext) {
  const store = CryptoStore.getInstance();
  treeDataProvider = new CryptoTreeDataProvider();

  // 注册 TreeDataProvider
  const treeView = vscode.window.createTreeView("cryptoPriceView", {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true,
  });

  // 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand("crypto-price-viewer.refresh", async () => {
      try {
        const data = await fetchCryptoData(store);
        if (data) {
          store.cryptoData = data;
          treeDataProvider.refresh();
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to fetch data: ${error}`);
      }
    }),

    vscode.commands.registerCommand("crypto-price-viewer.search", async () => {
      const searchTerm = await vscode.window.showInputBox({
        placeHolder: "输入要搜索的加密货币名称或符号",
      });
      if (searchTerm !== undefined) {
        store.searchTerm = searchTerm;
        treeDataProvider.refresh();
      }
    }),

    // 点击项目时显示详细信息
    vscode.commands.registerCommand(
      "crypto-price-viewer.showDetail",
      (item: CryptoItem) => {
        const panel = vscode.window.createWebviewPanel(
          "cryptoDetail",
          `${item.coin.name} Details`,
          vscode.ViewColumn.One,
          {}
        );
        panel.webview.html = treeDataProvider.getDetailView(item);
      }
    )
  );

  // 初始加载数据
  vscode.commands.executeCommand("crypto-price-viewer.refresh");
}

export function deactivate() {}
