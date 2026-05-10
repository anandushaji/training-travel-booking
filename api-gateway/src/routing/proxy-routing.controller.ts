import {
  All,
  Controller,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ProxyHttpClient } from './proxy-http.client';
import { buildRouteTable } from './route-table.config';

// Headers that must not be forwarded between proxy hops
const HOP_BY_HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade',
  // Encoding headers: axios decompresses automatically, so these are stale
  'content-encoding', 'content-length',
]);

@Controller()
export class ProxyRoutingController {
  private readonly routeTable = buildRouteTable(this.config);

  constructor(
    private readonly proxyClient: ProxyHttpClient,
    private readonly config: ConfigService,
  ) {}

  @All('*')
  async proxy(@Req() req: Request & { correlationId?: string; idempotencyKey?: string }, @Res() res: Response): Promise<void> {
    const path = req.path;
    const route = this.routeTable.find((r) => path.startsWith(r.prefix));

    if (!route) {
      res.status(404).json({ error: 'Not Found', message: `No route found for ${path}` });
      return;
    }

    const targetUrl = `${route.serviceUrl}${path}`;
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const fullUrl = `${targetUrl}${queryString}`;

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== 'host' && value) {
        headers[key] = Array.isArray(value) ? value.join(',') : value;
      }
    }
    if (req.correlationId) headers['X-Correlation-ID'] = req.correlationId;
    if (req.idempotencyKey) headers['Idempotency-Key'] = req.idempotencyKey;

    try {
      const response = await this.proxyClient.request(route.serviceName, {
        method: req.method as never,
        url: fullUrl,
        headers,
        data: req.body as unknown,
        params: req.query,
        ...(req.correlationId ? { correlationId: req.correlationId } : {}),
        ...(req.idempotencyKey ? { idempotencyKey: req.idempotencyKey } : {}),
      });

      // Forward response — strip hop-by-hop and stale encoding headers
      for (const [key, value] of Object.entries(response.headers)) {
        if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && value) {
          res.setHeader(key, value as string);
        }
      }
      res.status(response.status).send(response.data);
    } catch (err: unknown) {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Bad Gateway', message: 'Upstream service error' });
      }
    }
  }
}
