import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                admin: resolve(__dirname, 'admin.html'),
                heritage: resolve(__dirname, 'heritage-classic.html'),
                skeleton: resolve(__dirname, 'skeleton-series.html'),
                obsidian: resolve(__dirname, 'obsidian-series.html'),
                royal: resolve(__dirname, 'royal-editions.html')
            }
        }
    }
})