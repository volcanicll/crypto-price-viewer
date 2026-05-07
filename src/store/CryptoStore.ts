import * as vscode from "vscode";
import { CoinMarket, SortField, SortDirection, Currency } from "../types/interfaces";

export class CryptoStore {
  private static instance: CryptoStore;
  private _cryptoData: CoinMarket[] = [];
  private _searchTerm: string = "";
  private _retryCount: number = 0;
  private readonly _maxRetries: number = 3;
  private _sortField: SortField | null = null;
  private _sortDirection: SortDirection = "desc";
  private _watchlist: Set<string> = new Set();
  private _dataSource: string = "";
  private _lastUpdated: Date | null = null;

  private constructor() {}

  public static getInstance(): CryptoStore {
    if (!CryptoStore.instance) {
      CryptoStore.instance = new CryptoStore();
    }
    return CryptoStore.instance;
  }

  get cryptoData(): CoinMarket[] {
    return this._cryptoData;
  }

  set cryptoData(data: CoinMarket[]) {
    this._cryptoData = data;
    this._lastUpdated = new Date();
  }

  get searchTerm(): string {
    return this._searchTerm;
  }

  set searchTerm(term: string) {
    this._searchTerm = term.toLowerCase();
  }

  get retryCount(): number {
    return this._retryCount;
  }

  get maxRetries(): number {
    return this._maxRetries;
  }

  get sortField(): SortField | null {
    return this._sortField;
  }

  get sortDirection(): SortDirection {
    return this._sortDirection;
  }

  get watchlist(): Set<string> {
    return this._watchlist;
  }

  get dataSource(): string {
    return this._dataSource;
  }

  set dataSource(name: string) {
    this._dataSource = name;
  }

  get lastUpdated(): Date | null {
    return this._lastUpdated;
  }

  get refreshInterval(): number {
    const config = vscode.workspace.getConfiguration("cryptoPriceViewer");
    return config.get<number>("refreshInterval", 30);
  }

  get defaultLimit(): number {
    const config = vscode.workspace.getConfiguration("cryptoPriceViewer");
    return config.get<number>("defaultLimit", 200);
  }

  get preferredDataSource(): string {
    const config = vscode.workspace.getConfiguration("cryptoPriceViewer");
    return config.get<string>("preferredDataSource", "CoinGecko");
  }

  get currency(): Currency {
    const config = vscode.workspace.getConfiguration("cryptoPriceViewer");
    return config.get<Currency>("currency", "usd");
  }

  get showSparkline(): boolean {
    const config = vscode.workspace.getConfiguration("cryptoPriceViewer");
    return config.get<boolean>("showSparkline", false);
  }

  resetRetryCount() {
    this._retryCount = 0;
  }

  incrementRetryCount(totalApis: number) {
    this._retryCount++;
  }

  get currentApiIndex(): number {
    const preferred = this.preferredDataSource;
    const offset = preferred === "Binance" ? 1 : 0;
    return (offset + this._retryCount) % 2;
  }

  getFilteredData(): CoinMarket[] {
    const watchlisted: CoinMarket[] = [];
    const others: CoinMarket[] = [];

    for (const coin of this._cryptoData) {
      const matchesSearch =
        !this._searchTerm ||
        coin.name.toLowerCase().includes(this._searchTerm) ||
        coin.symbol.toLowerCase().includes(this._searchTerm);

      if (!matchesSearch) continue;

      if (this._watchlist.has(coin.id ?? coin.symbol)) {
        watchlisted.push(coin);
      } else {
        others.push(coin);
      }
    }

    const applySort = (data: CoinMarket[]): CoinMarket[] => {
      if (!this._sortField) return data;
      return [...data].sort((a, b) => {
        const aValue = a[this._sortField!] ?? 0;
        const bValue = b[this._sortField!] ?? 0;
        return this._sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      });
    };

    return [...applySort(watchlisted), ...applySort(others)];
  }

  sortBy(field: SortField) {
    if (this._sortField === field) {
      this._sortDirection = this._sortDirection === "asc" ? "desc" : "asc";
    } else {
      this._sortField = field;
      this._sortDirection = "desc";
    }
  }

  toggleWatchlist(coinId: string) {
    if (this._watchlist.has(coinId)) {
      this._watchlist.delete(coinId);
    } else {
      this._watchlist.add(coinId);
    }
  }

  isInWatchlist(coinId: string): boolean {
    return this._watchlist.has(coinId);
  }

  loadWatchlist(ids: string[]) {
    this._watchlist = new Set(ids);
  }

  getWatchlistIds(): string[] {
    return Array.from(this._watchlist);
  }

  clearSearch() {
    this._searchTerm = "";
  }

  get totalFiltered(): number {
    return this.getFilteredData().length;
  }

  get totalCoins(): number {
    return this._cryptoData.length;
  }
}
