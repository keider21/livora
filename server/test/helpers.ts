import type { AddressInfo } from 'node:net';
import { createServer, type Server } from 'node:http';
import { createApp } from '../src/app';

export interface TestApi {
  url: string;
  close(): Promise<void>;
  request<T = any>(
    method: string,
    path: string,
    options?: { body?: unknown; token?: string },
  ): Promise<{ status: number; data: T }>;
}

export async function startTestApi(): Promise<TestApi> {
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  return {
    url,
    async close() {
      await new Promise<void>((resolve) => (server as Server).close(() => resolve()));
    },
    async request(method, path, options = {}) {
      const response = await fetch(`${url}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      });
      const text = await response.text();
      return { status: response.status, data: text ? JSON.parse(text) : null };
    },
  };
}

/** Nombre único por ejecución para no chocar con datos de pruebas anteriores. */
export function uniqueName(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`.toLowerCase();
}
