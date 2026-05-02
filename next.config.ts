import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Bypass Vercel's image optimizer. Supabase Storage is already a CDN;
    // routing through /_next/image was hitting the monthly optimization
    // quota and returning 402 Payment Required for ALL images, plus 400
    // for filenames with apostrophes (e.g. "Knight Foundation -
    // Disinformation, 'Fake News,' …"). Disabling optimization fixes both.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gbsugjinzgagocsvsljj.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      'papaparse',
    ],
  },
};

export default nextConfig;
