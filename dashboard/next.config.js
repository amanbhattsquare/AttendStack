/** @type {import('next').NextConfig} */
const nextConfig = {
  // This empty object is needed to signal that you are opting into using Turbopack.
  // With this, Turbopack will handle module aliasing by automatically
  // using the `paths` configuration from your `tsconfig.json` file.
  turbopack: {},
};

module.exports = nextConfig;