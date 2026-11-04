import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

import fs from 'fs';

function githubModelProxyPlugin() {
  const modelUrl = 'https://github.com/lamhau2103-maker/APP-DEM-HEO/releases/download/v1.0.0/weights1.onnx';
  return {
    name: 'github-model-proxy',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const urlPath = req.url ? req.url.split('?')[0] : '';
        if (urlPath === '/api/model-proxy' || urlPath === '/weights1.onnx') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          try {
            const localFile = path.resolve(__dirname, 'public/weights1.onnx');
            if (fs.existsSync(localFile)) {
              res.setHeader('Content-Type', 'application/octet-stream');
              const stat = fs.statSync(localFile);
              res.setHeader('Content-Length', stat.size);
              fs.createReadStream(localFile).pipe(res);
              return;
            }

            const upstream = await fetch(modelUrl);
            if (!upstream.ok) {
              res.statusCode = upstream.status;
              res.end(`Upstream error: ${upstream.statusText}`);
              return;
            }
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            const arrayBuffer = await upstream.arrayBuffer();
            res.end(Buffer.from(arrayBuffer));
            return;
          } catch (e: any) {
            console.error('Lỗi proxy tải weights1.onnx:', e);
            res.statusCode = 500;
            res.end(e?.message || 'Error proxying model');
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), githubModelProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});


