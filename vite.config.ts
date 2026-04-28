import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import cesium from 'vite-plugin-cesium'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    vue(),
    cesium(),
    nodePolyfills({
      // 开启需要的 polyfill
      include: ['http', 'https', 'url', 'util', 'zlib', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true
      }
    })
  ],
  server: {
    watch: {
      usePolling: true // 解决部分系统不监听文件变化的问题
    },
    port: 9000,
    proxy: {
      // 代理天地图请求
      '/tianditu': {
        target: 'https://t0.tianditu.gov.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tianditu/, '')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
