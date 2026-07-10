/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist", "mammoth"],
    serverActions: {
      bodySizeLimit: "15mb"
    }
  }
};
export default nextConfig;
