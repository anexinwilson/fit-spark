import { searchEquipmentRows } from "@/features/equipment/search-equipment-core";

const rows = [
  {
    slug: "dumbbell",
    sourceValue: "dumbbell",
    displayName: "Dumbbell",
    category: "Free Weights",
    level: "beginner",
    aliases: ["dumbbells", "free weights"],
    primaryMuscles: ["biceps", "chest"],
    secondaryMuscles: ["shoulders"],
    imageUrls: ["https://storage.googleapis.com/example/dumbbell.jpg"],
  },
  {
    slug: "machine",
    sourceValue: "machine",
    displayName: "Machine",
    category: "Machines",
    level: "beginner",
    aliases: ["gym machine"],
    primaryMuscles: ["back"],
    secondaryMuscles: [],
    imageUrls: ["https://storage.googleapis.com/example/machine.jpg"],
  },
];

describe("Equipment catalog search", () => {
  it("returns the curated equipment catalog without an alternate data source", async () => {
    const response = searchEquipmentRows(rows);

    expect(response).toMatchObject({ success: true, source: "catalog" });
    expect(response.count).toBe(2);
    expect(response.results).toHaveLength(2);
  });

  it("finds equipment by name, alias, or muscle group", async () => {
    const response = searchEquipmentRows(rows, { q: "machine" });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toMatchObject({
      id: "machine",
      equipment_name: "Machine",
    });
  });

  it("applies category, level, and result limit filters", async () => {
    const response = searchEquipmentRows(rows, {
      category: "Machines",
      level: "beginner",
      limit: 3,
    });

    expect(response.results).toHaveLength(1);
    expect(
      response.results.every(
        (item) => item.category === "Machines" && item.level === "beginner",
      ),
    ).toBe(true);
  });
});
