const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'https://production.sricharamilk.com/api/:path*'
        }
      ]
    };
  }
};

export default nextConfig;
