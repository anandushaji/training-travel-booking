/* eslint-disable */
declare module 'axios-retry' {
  import { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

  export type IAxiosRetryConfig = {
    retries?: number;
    retryDelay?: (retryCount: number, error: AxiosError) => number;
    retryCondition?: (error: AxiosError) => boolean | Promise<boolean>;
    shouldResetTimeout?: boolean;
    onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => void;
  };

  function axiosRetry(axiosInstance: AxiosInstance, axiosRetryConfig?: IAxiosRetryConfig): void;
  export function isNetworkOrIdempotentRequestError(error: AxiosError): boolean;
  export default axiosRetry;
}
