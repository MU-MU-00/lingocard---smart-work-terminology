import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    const supabaseUrl = env.VITE_SUPABASE_URL ?? '';
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? '';
    
    console.log('Vite config - API Key loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
    console.log('Vite config - Supabase:', supabaseUrl ? 'configured' : 'NOT SET');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        open: true,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey),
        'import.meta.env.GEMINI_API_KEY': JSON.stringify(apiKey),
        'import.meta.env.API_KEY': JSON.stringify(apiKey),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
