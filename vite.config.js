import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [
    react(),
    {
      name: 'image-cors-proxy',
      configureServer(server) {
        server.middlewares.use('/api/proxy-image', async (req, res) => {
          try {
            const parsedUrl = new URL(req.url, 'http://localhost:5173');
            const targetUrl = parsedUrl.searchParams.get('url');
            if (!targetUrl) {
              res.statusCode = 400;
              res.end('Missing url param');
              return;
            }

            const fetchRes = await fetch(targetUrl);
            if (!fetchRes.ok) {
              res.statusCode = fetchRes.status;
              res.end(`Fetch failed: ${fetchRes.statusText}`);
              return;
            }

            const arrayBuffer = await fetchRes.arrayBuffer();
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.end(Buffer.from(arrayBuffer));
          } catch (err) {
            res.statusCode = 500;
            res.end('Proxy Error: ' + err.message);
          }
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html')
    }
  },
  server: {
    port: 5173
  }
});
