import { CryptoApiConfig, CoinMarket } from "../types/interfaces";

export const apiConfigs: CryptoApiConfig[] = [
  {
    name: "CoinGecko",
    baseUrl: "https://api.coingecko.com/api/v3",
    marketsEndpoint: "/coins/markets",
    transformResponse: (data: unknown): CoinMarket[] => data as CoinMarket[],
    params: (limit: number, currency: string, sparkline: boolean) => ({
      vs_currency: currency,
      order: "market_cap_desc",
      per_page: limit,
      page: 1,
      sparkline: sparkline,
    }),
  },
  {
    name: "Binance",
    baseUrl: "https://api.binance.com/api/v3",
    marketsEndpoint: "/ticker/24hr",
    transformResponse: (data: unknown): CoinMarket[] => {
      const items = data as Array<Record<string, string>>;
      return items
        .filter((item) => item.symbol.endsWith("USDT"))
        .map((item, index): CoinMarket => {
          const baseSymbol = item.symbol.replace("USDT", "");
          return {
            id: baseSymbol.toLowerCase(),
            symbol: baseSymbol.toLowerCase(),
            name: baseSymbol,
            image: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${baseSymbol.toLowerCase()}.png`,
            current_price: parseFloat(item.lastPrice),
            price_change_percentage_24h: parseFloat(item.priceChangePercent),
            market_cap: parseFloat(item.quoteVolume),
            market_cap_rank: index + 1,
            total_volume: parseFloat(item.volume),
            high_24h: parseFloat(item.highPrice),
            low_24h: parseFloat(item.lowPrice),
            market_cap_change_percentage_24h: null,
            circulating_supply: null,
            total_supply: null,
            max_supply: null,
            ath: null,
            ath_change_percentage: null,
            ath_date: null,
            atl: null,
            atl_change_percentage: null,
            atl_date: null,
            last_updated: item.closeTime ? new Date(parseInt(item.closeTime)).toISOString() : null,
          };
        });
    },
    params: () => ({}),
  },
];
