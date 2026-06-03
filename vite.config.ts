import path from 'path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

type ApiHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;

function localApiRoutes(): Plugin {
  const apiRoutes = new Map([
    [
      '/api/auth/register',
      pathToFileURL(path.resolve(__dirname, 'api/auth/register.js')).href,
    ],
    [
      '/api/avatars/presign',
      pathToFileURL(path.resolve(__dirname, 'api/avatars/presign.js')).href,
    ],
    [
      '/api/posts/presign',
      pathToFileURL(path.resolve(__dirname, 'api/posts/presign.js')).href,
    ],
    [
      '/api/users/import',
      pathToFileURL(path.resolve(__dirname, 'api/users/import.js')).href,
    ],
  ]);

  return {
    name: 'local-api-routes',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const route = request.url ? apiRoutes.get(request.url.split('?')[0]) : undefined;

        if (!route) {
          next();
          return;
        }

        try {
          const { default: handler } = (await import(route)) as {
            default: ApiHandler;
          };
          await handler(request, response);
        } catch (error) {
          console.error('Local API route failed:', error);

          if (!response.headersSent) {
            response.statusCode = 500;
            response.setHeader('Content-Type', 'application/json');
          }

          if (!response.writableEnded) {
            response.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : 'Local API route failed.',
              }),
            );
          }
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  for (const [name, value] of Object.entries(env)) {
    process.env[name] ??= value;
  }

  return {
    plugins: [react(), tailwindcss(), localApiRoutes()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
