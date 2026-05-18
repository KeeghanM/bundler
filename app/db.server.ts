import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient;
}

function getPrismaClient() {
  const url = process.env.DATABASE_URL;

  // Use Turso/libsql if the URL indicates it
  if (url && (url.startsWith("libsql:") || url.startsWith("https:") || url.startsWith("wss:"))) {
    const libsql = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter });
  }

  // Fallback to local file or undefined (letting Prisma pick it up from env naturally)
  return new PrismaClient();
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = getPrismaClient();
  }
}

const prisma = global.prismaGlobal ?? getPrismaClient();

export default prisma;
