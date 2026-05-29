import path from 'path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

type ApiHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;

function localApiRoutes(): Plugin {
  const avatarPresignRoute = pathToFileURL(path.resolve(__dirname, 'api/avatars/presign.js')).href;

  return {
    name: 'local-api-routes',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== '/api/avatars/presign') {
          next();
          return;
        }

        try {
          const { default: handler } = (await import(avatarPresignRoute)) as {
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
