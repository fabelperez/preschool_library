import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user (password: admin123)
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      role: "admin",
    },
  });

  // Create categories
  const categories = await Promise.all(
    [
      { name: "Fiction", description: "Fictional stories and picture books" },
      { name: "Non-Fiction", description: "Educational and informational books" },
      { name: "Science", description: "Science and nature books" },
      { name: "Math", description: "Math and counting books" },
      { name: "Art & Music", description: "Creative arts and music books" },
      { name: "Social Skills", description: "Books about feelings, sharing, and friendship" },
    ].map((cat) =>
      prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: cat,
      })
    )
  );

  // Create shelves with layout positions
  const shelf1 = await prisma.shelf.create({
    data: { name: "Shelf A - Main Wall", position: 1, layoutX: 5, layoutY: 8, layoutWidth: 40, layoutHeight: 14 },
  });
  const shelf2 = await prisma.shelf.create({
    data: { name: "Shelf B - Reading Corner", position: 2, layoutX: 55, layoutY: 8, layoutWidth: 40, layoutHeight: 14 },
  });
  const shelf3 = await prisma.shelf.create({
    data: { name: "Shelf C - Window Side", position: 3, layoutX: 5, layoutY: 65, layoutWidth: 30, layoutHeight: 14 },
  });

  // Create shelf sections (assign categories to shelves)
  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));
  
  await prisma.shelfSection.createMany({
    data: [
      { shelfId: shelf1.id, categoryId: catMap["Fiction"], label: "Stories", position: 1 },
      { shelfId: shelf1.id, categoryId: catMap["Social Skills"], label: "Life Lessons", position: 2 },
      { shelfId: shelf2.id, categoryId: catMap["Science"], label: "Explore & Discover", position: 1 },
      { shelfId: shelf2.id, categoryId: catMap["Math"], label: "Numbers & Shapes", position: 2 },
      { shelfId: shelf3.id, categoryId: catMap["Non-Fiction"], label: "Learn About", position: 1 },
      { shelfId: shelf3.id, categoryId: catMap["Art & Music"], label: "Create & Play", position: 2 },
    ],
  });

  // Create sample books
  await prisma.book.createMany({
    data: [
      { title: "The Very Hungry Caterpillar", author: "Eric Carle", isbn: "9780399226908", totalCopies: 3, categoryId: catMap["Fiction"] },
      { title: "Goodnight Moon", author: "Margaret Wise Brown", isbn: "9780064430173", totalCopies: 2, categoryId: catMap["Fiction"] },
      { title: "Brown Bear, Brown Bear, What Do You See?", author: "Bill Martin Jr.", isbn: "9780805047905", totalCopies: 2, categoryId: catMap["Fiction"] },
      { title: "National Geographic Little Kids First Big Book of Why", author: "Amy Shields", isbn: "9781426307935", totalCopies: 1, categoryId: catMap["Non-Fiction"] },
      { title: "Ada Twist, Scientist", author: "Andrea Beaty", isbn: "9781419721373", totalCopies: 2, categoryId: catMap["Science"] },
      { title: "Counting Crocodiles", author: "Judy Sierra", isbn: "9780152163563", totalCopies: 1, categoryId: catMap["Math"] },
      { title: "The Dot", author: "Peter H. Reynolds", isbn: "9780763619619", totalCopies: 2, categoryId: catMap["Art & Music"] },
      { title: "Have You Filled a Bucket Today?", author: "Carol McCloud", isbn: "9780996099936", totalCopies: 3, categoryId: catMap["Social Skills"] },
    ],
  });

  // Create sample teachers
  await prisma.teacher.createMany({
    data: [
      { name: "Ms. Johnson", email: "johnson@school.edu" },
      { name: "Mr. Rodriguez", email: "rodriguez@school.edu" },
      { name: "Ms. Patel", email: "patel@school.edu" },
      { name: "Mrs. Williams", email: "williams@school.edu" },
    ],
  });

  // Create room fixtures (door, window, reading area)
  await prisma.roomFixture.createMany({
    data: [
      { type: "door", label: "Door", emoji: "🚪", layoutX: 44, layoutY: 82, layoutWidth: 12, layoutHeight: 18, borderStyle: "solid", bgColor: "bg-amber-700/30", position: 1 },
      { type: "window", label: "Window", emoji: "🪟", layoutX: 41, layoutY: 25, layoutWidth: 18, layoutHeight: 15, borderStyle: "solid", bgColor: "bg-sky-200/50", position: 2 },
      { type: "rug", label: "Reading Area", emoji: "📖", layoutX: 32, layoutY: 45, layoutWidth: 36, layoutHeight: 22, borderStyle: "dashed", bgColor: "bg-indigo-100/50", position: 3 },
    ],
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
