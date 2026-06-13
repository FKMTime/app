import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../prisma";

function generateApiKey() {
  const plaintext = `fkm_${randomBytes(32).toString("hex")}`;
  return {
    plaintext,
    hash: createHash("sha256").update(plaintext).digest("hex"),
    lastFour: plaintext.slice(-4),
  };
}

const wcaId = process.env.SMOKE_WCA_ID || `SMOKE${Date.now()}`;

async function main() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({ data: { name: "Smoke user" } });
  }

  const start = new Date();
  const end = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const comp = await prisma.competition.create({
    data: {
      wcaId,
      name: `Smoke ${wcaId}`,
      startDate: start,
      endDate: end,
      status: "APPROVED",
      requestedById: user.id,
    },
  });

  const key = generateApiKey();
  await prisma.apiKey.create({
    data: {
      competitionId: comp.id,
      keyHash: key.hash,
      lastFour: key.lastFour,
      expiresAt: new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  process.stdout.write(
    JSON.stringify({ competitionId: comp.id, wcaId, apiKey: key.plaintext }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
