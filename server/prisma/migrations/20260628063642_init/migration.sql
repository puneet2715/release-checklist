-- CreateTable
CREATE TABLE "releases" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "release_date" TIMESTAMPTZ(6) NOT NULL,
    "additional_info" TEXT,
    "steps" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "releases_release_date_idx" ON "releases"("release_date");
