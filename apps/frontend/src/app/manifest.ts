import type { MetadataRoute } from 'next';

/** Installable app (PWA) — required for Web Push on iOS and for the home-screen icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DCash — Finanças e casa em família',
    short_name: 'DCash',
    description: 'Gerenciador financeiro familiar com o DCaos, o gerenciador oficial da bagunça da casa.',
    id: '/',
    start_url: '/painel',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f1110',
    theme_color: '#0f1110',
    lang: 'pt-BR',
    categories: ['finance', 'productivity', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Painel gerencial', url: '/painel', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Casa (DCaos)', url: '/dcaos', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Quem Vai Fazer?', url: '/dcaos/tarefas', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Abastece Aí', url: '/dcaos/mercado', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
