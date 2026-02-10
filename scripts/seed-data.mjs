import { drizzle } from "drizzle-orm/mysql2";
import { categories, products, purchases, sales, investments } from "../drizzle/schema.js";
import * as dotenv from "dotenv";

dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

async function seedCategories() {
  console.log("Seeding categories...");
  
  const categoriesToSeed = [
    { name: "Pokémon", code: "POK" },
    { name: "Dragon Ball Z", code: "DBZ" },
    { name: "Merch", code: "MRC" },
    { name: "One Piece", code: "OPI" },
    { name: "Yu Gi Oh", code: "YGO" },
  ];

  for (const category of categoriesToSeed) {
    try {
      await db.insert(categories).values(category).onDuplicateKeyUpdate({ set: { name: category.name } });
      console.log(`✓ Category ${category.name} (${category.code}) seeded`);
    } catch (error) {
      console.log(`  Category ${category.name} already exists`);
    }
  }
}

async function main() {
  try {
    await seedCategories();
    console.log("\n✓ Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
  process.exit(0);
}

main();
