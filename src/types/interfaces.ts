export interface CryptoApiConfig {
  name: string;
  baseUrl: string;
  marketsEndpoint: string;
  transformResponse: (data: any) => any[];
  params: (limit: number) => any;
}

export interface WebviewMessage {
  type: string;
  value?: any;
  error?: string;
  data?: any[];
}
