import axios from "axios";
import { CryptoStore } from "../store/CryptoStore";
import { apiConfigs } from "../config/apiConfig";

export async function fetchCryptoData(
  store: CryptoStore
): Promise<any[] | null> {
  store.resetRetryCount();

  while (store.retryCount < store.maxRetries) {
    try {
      const currentApi = apiConfigs[store.currentApiIndex];
      const response = await axios.get(
        `${currentApi.baseUrl}${currentApi.marketsEndpoint}`,
        {
          params: currentApi.params(store.limit),
          timeout: 5000,
        }
      );

      const transformedData = currentApi.transformResponse(response.data);
      if (!transformedData || transformedData.length === 0) {
        throw new Error("No data received");
      }
      return transformedData;
    } catch (error) {
      store.incrementRetryCount();
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
