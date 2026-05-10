import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Provide an absolute base URL so Node.js native fetch (undici) does not reject
// relative URLs when RTK Query constructs requests in the jsdom test environment.
(window as Window & { __ENV__?: Record<string, string> }).__ENV__ = {
  REACT_APP_API_URL: 'http://localhost/api',
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

