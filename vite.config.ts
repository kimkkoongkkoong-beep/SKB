
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/SKB/', // 깃허브 저장소 이름이 SKB인 경우 필수 설정입니다.
  build: {
    outDir: 'dist',
  },
});
