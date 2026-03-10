/** @type {import('next').NextConfig} */
const nextConfig = {
  // typescript: {
    // Permite que o build termine mesmo se houver erros de tipagem
    // ignoreBuildErrors: true,
  // },
  // eslint: {
    // Também ignora erros de ESLint durante o build para evitar travamentos
    // ignoreDuringBuilds: true,
  // },
  // experimental: {
    // turbo: {
      // root: '../../', // Aponta para a raiz do seu monorepo (dcash-app)
    // },
  reactStrictMode: true,
  // },
};

export default nextConfig;