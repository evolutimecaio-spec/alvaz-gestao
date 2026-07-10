/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["mammoth"],
    serverActions: {
      bodySizeLimit: "15mb"
    }
  }
};
export default nextConfig;
