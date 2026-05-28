/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/@:handle",
        destination: "/:handle",
      },
    ];
  },
};

export default nextConfig;
