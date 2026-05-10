import { describe, it, expect } from 'vitest';
import { server } from './server';
import { http, HttpResponse } from './handlers';

describe('MSW server', () => {
  it('should set up MSW server without errors', () => {
    expect(server).toBeDefined();
  });

  it('should intercept fetch via MSW handler', async () => {
    server.use(
      http.get('/test-endpoint', () => HttpResponse.json({ ok: true })),
    );

    const res = await fetch('/test-endpoint');
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });
});
