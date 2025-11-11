/**
 * Prisma configuration extracted from package.json to satisfy Prisma 7+ requirements.
 * This keeps CLI warnings away and ensures future compatibility.
 */
const config = {
  generators: [
    {
      provider: "prisma-client-js",
    },
  ],
  datasources: [
    {
      name: "db",
      provider: "mysql",
      url: {
        fromEnvVar: "DATABASE_URL",
      },
    },
  ],
};

module.exports = config;
