import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * La API pública de NASA OSDR solo permite CORS a su propio dominio: en desarrollo (y en `vite preview`)
 * la servimos a través de este proxy. En producción lo hace la Cloudflare Function functions/api/osdr/[[path]].ts.
 */
const osdrProxy = {
  '/api/osdr': {
    target: 'https://osdr.nasa.gov',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/osdr/, '/osdr/data'),
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: osdrProxy },
  preview: { proxy: osdrProxy },
});
