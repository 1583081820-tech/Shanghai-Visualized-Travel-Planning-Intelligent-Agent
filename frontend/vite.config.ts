// vite.config.ts
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // ========== 后端 API 代理 ==========
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        timeout: 300000, // 5分钟超时，Agent接口可能需要较长时间
        proxyTimeout: 300000, // 代理超时也设为5分钟
        configure(proxy) {
          proxy.on('proxyReq', () => {
            console.log('👉 API请求已转发');
          });
          proxy.on('error', (err) => {
            console.error('❌ API代理错误:', err.message);
          });
          proxy.on('proxyRes', (proxyRes) => {
            console.log('✅ API响应:', proxyRes.statusCode);
          });
        }
      },
      // ========== 高德API代理（保留，前端地图组件可能需要） ==========
      '/amap': {
        target: 'https://restapi.amap.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/amap/, ''),
        timeout: 10000,
      },
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'map-vendor': ['maplibre-gl'],
          'animation-vendor': ['gsap', '@gsap/react', 'framer-motion'],
        }
      }
    }
  }
});
