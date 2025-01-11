import * as vscode from "vscode";
import { CryptoViewProvider } from "./webview/WebviewProvider";

let sidebarProvider: CryptoViewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  sidebarProvider = new CryptoViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "cryptoPriceView",
      sidebarProvider
    )
  );
}

export function deactivate() {}
