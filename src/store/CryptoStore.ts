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
  private _sortField: "market_cap" | "price_change_percentage_24h" | null =
    null;
  private _sortDirection: "asc" | "desc" = "desc";

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
    let filteredData = this._cryptoData.filter(
      (coin) =>
        coin.name.toLowerCase().includes(this._searchTerm) ||
        coin.symbol.toLowerCase().includes(this._searchTerm)
    );

    if (this._sortField) {
      filteredData.sort((a, b) => {
        const aValue = a[this._sortField!] ?? 0;
        const bValue = b[this._sortField!] ?? 0;
        return this._sortDirection === "asc"
          ? aValue - bValue
          : bValue - aValue;
      });
    }

    return filteredData;
  }

  // 排序方法
  sortBy(field: "market_cap" | "price_change_percentage_24h") {
    if (this._sortField === field) {
      // 如果已经在按这个字段排序，切换排序方向
      this._sortDirection = this._sortDirection === "asc" ? "desc" : "asc";
    } else {
      // 新的排序字段，默认降序
      this._sortField = field;
      this._sortDirection = "desc";
    }
  }

  // Getters for sort state
  get sortField() {
    return this._sortField;
  }

  get sortDirection() {
    return this._sortDirection;
  }
}
