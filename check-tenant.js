const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const tenant = await prisma.tenant.findFirst({
      select: { id: true, name: true },
    });
    console.log(JSON.stringify(tenant || null));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
