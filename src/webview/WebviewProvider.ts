import * as vscode from "vscode";
import { getHtmlContent } from "./htmlContent";
import { CryptoStore } from "../store/CryptoStore";
import { WebviewMessage } from "../types/interfaces";
import { fetchCryptoData } from "../services/cryptoService";

export class CryptoViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private readonly _store: CryptoStore;

  constructor(private readonly _extensionUri: vscode.Uri) {
    this._store = CryptoStore.getInstance();
  }

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

    webviewView.webview.html = getHtmlContent();

    // 如果有缓存数据，直接显示
    if (this._store.cryptoData.length > 0) {
      this._updateView();
    } else {
      await this.updatePrices();
    }

    webviewView.webview.onDidReceiveMessage(this._handleMessage.bind(this));
  }

  private async _handleMessage(message: WebviewMessage) {
    switch (message.type) {
      case "search":
        this._store.searchTerm = message.value;
        this._updateView();
        break;
      case "refresh":
        await this.updatePrices();
        break;
      case "changeLimit":
        this._store.limit = parseInt(message.value);
        await this.updatePrices();
        break;
    }
  }

  private async updatePrices(): Promise<void> {
    if (this._view?.visible) {
      this._view.webview.postMessage({ type: "showLoading" });
    }

    try {
      const data = await fetchCryptoData(this._store);
      if (data) {
        this._store.cryptoData = data;
        this._updateView();
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to fetch cryptocurrency data: ${error}. Please try refreshing manually.`
      );
    } finally {
      if (this._view?.visible) {
        this._view.webview.postMessage({ type: "hideLoading" });
      }
    }
  }

  private _updateView() {
    if (this._view) {
      this._view.webview.postMessage({
        type: "update",
        data: this._store.getFilteredData(),
      });
    }
  }
}
