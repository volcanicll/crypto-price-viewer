import axios from "axios";
import { CryptoStore } from "../store/CryptoStore";
import { apiConfigs } from "../config/apiConfig";
import { CoinMarket } from "../types/interfaces";

export async function fetchCryptoData(
  store: CryptoStore
): Promise<CoinMarket[] | null> {
  store.resetRetryCount();

  while (store.retryCount < store.maxRetries) {
    const apiIndex = store.currentApiIndex;
    try {
      const currentApi = apiConfigs[apiIndex];
      const response = await axios.get(
        `${currentApi.baseUrl}${currentApi.marketsEndpoint}`,
        {
          params: currentApi.params(
            store.defaultLimit,
            store.currency,
            store.showSparkline
          ),
          timeout: 10000,
        }
      );

      const transformedData = currentApi.transformResponse(response.data);
      if (!transformedData || transformedData.length === 0) {
        throw new Error("No data received");
      }

      store.dataSource = currentApi.name;
      return transformedData;
    } catch (error) {
      store.incrementRetryCount(apiConfigs.length);
      if (store.retryCount === store.maxRetries) {
        throw new Error(`All APIs failed after ${store.maxRetries} retries`);
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * store.retryCount)
      );
    }
  }
  return null;
}
