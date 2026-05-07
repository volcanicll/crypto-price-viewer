export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  high_24h: number | null;
  low_24h: number;
  price_change_percentage_24h: number | null;
  market_cap_change_percentage_24h: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_change_percentage: number | null;
  atl_date: string | null;
  last_updated: string | null;
  sparkline_in_7d?: { price: number[] };
  next_unlock_date?: string | null;
  next_unlock_amount?: number | null;
  linear_unlock_info?: string | null;
  lock_contract_address?: string | null;
}

export interface CryptoApiConfig {
  name: string;
  baseUrl: string;
  marketsEndpoint: string;
  transformResponse: (data: unknown) => CoinMarket[];
  params: (limit: number, currency: string, sparkline: boolean) => Record<string, unknown>;
}

export interface WebviewMessage {
  type: string;
  value?: string;
  error?: string;
  data?: CoinMarket[];
}

export type SortField = "market_cap" | "price_change_percentage_24h";
export type SortDirection = "asc" | "desc";
export type Currency = "usd" | "eur" | "cny" | "jpy" | "krw";
