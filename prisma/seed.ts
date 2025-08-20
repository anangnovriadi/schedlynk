import { storage } from "../server/storage";

async function main() {
  console.log("Seeding database...");

  // Create demo users
  const alice = await storage.createUser({
    email: "admin@example.com",
    name: "Alice Admin",
  });

  const bob = await storage.createUser({
    email: "bob@example.com",
    name: "Bob Member",
  });

  const carol = await storage.createUser({
    email: "carol@example.com",
    name: "Carol Member",
  });

  // Create demo team
  const demoTeam = await storage.createTeam({
    name: "Demo Team",
    slug: "demo",
  });

  // Create sales team
  const salesTeam = await storage.createTeam({
    name: "Sales Team",
    slug: "sales",
  });

  // Add members to demo team
  await storage.createTeamMember({
    userId: alice.id,
    teamId: demoTeam.id,
    role: "ADMIN",
  });

  await storage.createTeamMember({
    userId: bob.id,
    teamId: demoTeam.id,
    role: "MEMBER",
  });

  await storage.createTeamMember({
    userId: carol.id,
    teamId: demoTeam.id,
    role: "MEMBER",
  });

  // Add Alice to sales team as member
  await storage.createTeamMember({
    userId: alice.id,
    teamId: salesTeam.id,
    role: "MEMBER",
  });

  // Create demo services
  const introService = await storage.createService({
    name: "15-min Intro Call",
    description: "Quick introduction and consultation",
    duration: 15,
    teamId: demoTeam.id,
  });

  const consultationService = await storage.createService({
    name: "30-min Consultation",
    description: "In-depth consultation session",
    duration: 30,
    teamId: demoTeam.id,
  });

  // Add service members
  await storage.addServiceMember({
    serviceId: introService.id,
    userId: alice.id,
    order: 0,
  });

  await storage.addServiceMember({
    serviceId: introService.id,
    userId: bob.id,
    order: 1,
  });

  await storage.addServiceMember({
    serviceId: consultationService.id,
    userId: alice.id,
    order: 0,
  });

  await storage.addServiceMember({
    serviceId: consultationService.id,
    userId: bob.id,
    order: 1,
  });

  await storage.addServiceMember({
    serviceId: consultationService.id,
    userId: carol.id,
    order: 2,
  });

  console.log("Database seeded successfully!");
}

main().catch(console.error);
