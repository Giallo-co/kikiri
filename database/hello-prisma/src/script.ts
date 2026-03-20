import { prisma } from "./lib/prisma";

async function main() {
  const user = await prisma.user.create({
    data: {
      name: "Alice",
      email: "alice@prisma.io",
      credential: {
        create: {
          password: "hashed_password_here"
        }
      }
    },
    include: {
      credential: true
    }
  });

  console.log("Created user:", user);

  // Fetch all users with their credentials
  const allUsers = await prisma.user.findMany({
    include: {
      credential: true
    }
  });

  console.log("All users:", JSON.stringify(allUsers, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });