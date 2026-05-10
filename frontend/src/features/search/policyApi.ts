import { baseApi } from '../../api/baseApi';
import type { PolicyValidationResult } from './search.types';

export interface ValidatePolicyParams {
  offerId: string;
  amount: number;
  currency: string;
}

export const policyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    validatePolicy: build.query<PolicyValidationResult, ValidatePolicyParams>({
      query: ({ offerId, amount, currency }) => ({
        url: '/policies/validate',
        params: { offerId, amount, currency },
      }),
      keepUnusedDataFor: 60,
    }),
  }),
  overrideExisting: false,
});

export const { useValidatePolicyQuery } = policyApi;
