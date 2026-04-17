CREATE EXTENSION IF NOT EXISTS vector;
-- CreateTable
CREATE TABLE "documents" (
    "id" BIGSERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "metadata" JSONB DEFAULT '{}',
    "user_id" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);
