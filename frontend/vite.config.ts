import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import Sitemap from 'vite-plugin-sitemap';
import { defineConfig, type UserConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        Sitemap({
            hostname: 'https://hostellifeplus.com', // Replace with your live URL
            dynamicRoutes: ['/', '/hostels', '/map', '/unauthorized'], // List your application sub-routes here
            changefreq: 'weekly',
            priority: 0.8,
            generateRobotsTxt: true,

            // Write the specific crawling directives
            robots: [
                {
                    userAgent: '*', // Applies to all search engine bots (Google, Bing, etc.)
                    allow: [
                        // Publicly allow crawling on these entry points
                        '/',
                        '/hostels',
                        '/map',
                    ],
                    disallow: [
                        // Strictly forbid bots from looking at these paths
                        '/login',
                        '/register',
                        '/forgot-password',
                        '/setup-password',
                        '/verify-email',
                        '/student/', // Blocks everything inside the student route tree
                        '/manager/', // Blocks everything inside the manager route tree
                        '/admin/', // Blocks everything inside the admin route tree
                    ],
                },
            ],
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: 'dist',
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            output: {
                // Using a function for manualChunks resolves the TS error
                // and gives you safer, more granular control over chunking.
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (
                            id.includes('react') ||
                            id.includes('react-dom') ||
                            id.includes('react-router-dom') ||
                            id.includes('@tanstack/react-query')
                        ) {
                            return 'react-vendor';
                        }
                        if (id.includes('maplibre-gl')) {
                            return 'map-vendor';
                        }
                        if (
                            id.includes('framer-motion') ||
                            id.includes('lucide-react') ||
                            id.includes('@base-ui/react')
                        ) {
                            return 'ui-vendor';
                        }
                    }
                },
            },
        },
    },
    // Using `undefined` instead of `[]` fixes the ESBuildOptions type mismatch
    oxc: {
        drop:
            process.env.NODE_ENV === 'production'
                ? ['console', 'debugger']
                : undefined,
    } as UserConfig['oxc'],
});
