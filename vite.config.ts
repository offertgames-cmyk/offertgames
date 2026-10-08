import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { alertServerMiddleware } from './src/server/alertServer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      {
        name: 'alert-server-plugin',
        configureServer(server) {
          alertServerMiddleware(server, env);
        }
      }
    ],
    server: {
      port: 5000,
      open: false,
      proxy: {
        '/api/nvidia-proxy': {
          target: 'https://integrate.api.nvidia.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nvidia-proxy/, ''),
          headers: {
            Authorization: `Bearer ${env.VITE_NVIDIA_API_KEY || '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'}`
          }
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
          chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
          assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
        }
      }
    }
  };
});
