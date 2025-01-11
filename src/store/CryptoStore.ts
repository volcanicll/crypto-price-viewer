import * as vscode from "vscode";
import { CryptoApiConfig } from "../types/interfaces";

export class CryptoStore {
  private static instance: CryptoStore;
  private _cryptoData: any[] = [];
  private _searchTerm: string = "";
  private _limit: number = 200;
  private _currentApiIndex: number = 0;
  private _retryCount: number = 0;
  private readonly _maxRetries: number = 3;

  private constructor() {}

  public static getInstance(): CryptoStore {
    if (!CryptoStore.instance) {
      CryptoStore.instance = new CryptoStore();
    }
    return CryptoStore.instance;
  }

  // Getters
  get cryptoData() {
    return this._cryptoData;
  }
  get searchTerm() {
    return this._searchTerm;
  }
  get limit() {
    return this._limit;
  }
  get currentApiIndex() {
    return this._currentApiIndex;
  }
  get retryCount() {
    return this._retryCount;
  }
  get maxRetries() {
    return this._maxRetries;
  }

  // Setters
  set cryptoData(data: any[]) {
    this._cryptoData = data;
  }

  set searchTerm(term: string) {
    this._searchTerm = term.toLowerCase();
  }

  set limit(value: number) {
    this._limit = value;
  }

  resetRetryCount() {
    this._retryCount = 0;
    this._currentApiIndex = 0;
  }

  incrementRetryCount() {
    this._retryCount++;
    this._currentApiIndex = (this._currentApiIndex + 1) % 2;
  }

  getFilteredData() {
    return this._cryptoData.filter(
      (coin) =>
        coin.name.toLowerCase().includes(this._searchTerm) ||
        coin.symbol.toLowerCase().includes(this._searchTerm)
    );
  }
}
