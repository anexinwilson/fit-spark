CREATE TABLE "equipment" (
    "slug" TEXT NOT NULL,
    "source_value" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "aliases" TEXT[] NOT NULL,
    "primary_muscles" TEXT[] NOT NULL,
    "secondary_muscles" TEXT[] NOT NULL,
    "image_urls" TEXT[] NOT NULL,
    "exercise_count" INTEGER NOT NULL DEFAULT 0,
    "source_commit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("slug")
);

CREATE UNIQUE INDEX "equipment_source_value_key" ON "equipment"("source_value");
