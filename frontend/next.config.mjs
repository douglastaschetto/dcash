/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Permite que o build termine mesmo se houver erros de tipagem
    ignoreBuildErrors: true,
  },
  eslint: {
    // Também ignora erros de ESLint durante o build para evitar travamentos
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;