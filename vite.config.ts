import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    
    console.log('Vite config - API Key loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        open: true,
      },
      plugins: [react()],
      define: {
        // 同时支持 process.env 和 import.meta.env
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
        // Vite 客户端环境变量
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey),
        'import.meta.env.GEMINI_API_KEY': JSON.stringify(apiKey),
        'import.meta.env.API_KEY': JSON.stringify(apiKey),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
