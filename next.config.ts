import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "27mb" } },
  outputFileTracingIncludes: {
    "/admin/documentacion/*": [
      "./docs/ingenieria-procesos/*.html",
      "./docs/ingenieria-procesos/*.css",
      "./docs/ingenieria-procesos/*.js",
      "./docs/ingenieria-procesos/README.md",
      "./docs/ingenieria-procesos/manifest.json",
      "./docs/ingenieria-procesos/bpmn/*.bpmn",
      "./docs/ingenieria-procesos/vendor/**",
      "./docs/arquitectura/eventos.html",
    ],
  },
  async redirects() {
    return [
      {
        source: "/eventos/:slug",
        destination: "/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
