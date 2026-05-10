import { http, HttpResponse } from 'msw';
import type { PolicyValidationResult } from '../../features/search/search.types';

export const policyHandlers = [
  http.get('http://localhost/api/policies/validate', () =>
    HttpResponse.json<PolicyValidationResult>({ compliant: true }),
  ),
];
