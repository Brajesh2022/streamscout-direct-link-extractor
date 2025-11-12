import { Hono } from "hono";
import type { Env } from './core-utils';
import { ok, bad } from './core-utils';
import { processUrl } from './scraper';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.post('/api/process-url', async (c) => {
    try {
      const { url } = await c.req.json<{ url: string }>();
      if (!url || typeof url !== 'string') {
        return bad(c, 'URL is required');
      }
      // Validate URL format
      try {
        new URL(url);
      } catch (e) {
        return bad(c, 'Invalid URL format');
      }
      const result = await processUrl(url);
      return ok(c, result);
    } catch (error: unknown) {
      console.error('Processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return bad(c, errorMessage);
    }
  });
}