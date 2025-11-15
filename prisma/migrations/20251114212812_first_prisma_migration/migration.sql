-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegram_user_id" BIGINT NOT NULL,
    "phone_number" TEXT,
    "session" TEXT,
    "init_data_raw" TEXT,
    "init_data_user" JSONB,
    "init_data_chat" JSONB,
    "custom_prompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_configure" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tool" TEXT,
    "prompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_configure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_user_id_key" ON "users"("telegram_user_id");

-- CreateIndex
CREATE INDEX "users_telegram_user_id_idx" ON "users"("telegram_user_id");

-- CreateIndex
CREATE INDEX "ai_configure_user_id_idx" ON "ai_configure"("user_id");

-- AddForeignKey
ALTER TABLE "ai_configure" ADD CONSTRAINT "ai_configure_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
