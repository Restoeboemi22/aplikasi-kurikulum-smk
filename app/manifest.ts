import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aplikasi Kurikulum SMKS Pacet',
    short_name: 'Kurikulum SMK',
    description: 'Sistem Penilaian & Kurikulum Terpadu SMKS Pacet',
    start_url: '/',
    display: 'standalone',
    background_color: '#fdf2f8', // matching pink-50 from background
    theme_color: '#1e3a8a', // matching primary-900 (blue)
    icons: [
      {
        src: '/icon.png', // Next.js will map app/icon.png to /icon.png or generate it
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
