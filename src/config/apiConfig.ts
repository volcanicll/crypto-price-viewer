import { CryptoApiConfig } from "../types/interfaces";

export const apiConfigs: CryptoApiConfig[] = [
  {
    name: "CoinGecko",
    baseUrl: "https://api.coingecko.com/api/v3",
    marketsEndpoint: "/coins/markets",
    transformResponse: (data) => data,
    params: (limit) => ({
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: limit,
      page: 1,
      sparkline: false,
    }),
  },
  {
    name: "Binance",
    baseUrl: "https://api.binance.com/api/v3",
    marketsEndpoint: "/ticker/24hr",
    transformResponse: (data) => {
      return data
        .filter((item: any) => item.symbol.endsWith("USDT"))
        .map((item: any, index: number) => ({
          market_cap_rank: index + 1,
          name: item.symbol.replace("USDT", ""),
          symbol: item.symbol.replace("USDT", "").toLowerCase(),
          image: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${item.symbol
            .replace("USDT", "")
            .toLowerCase()}.png`,
          current_price: parseFloat(item.lastPrice),
          price_change_percentage_24h: parseFloat(item.priceChangePercent),
          market_cap: parseFloat(item.quoteVolume),
          total_volume: parseFloat(item.volume),
          circulating_supply: 0,
          total_supply: 0,
        }));
    },
    params: (limit) => ({}),
  },
];
