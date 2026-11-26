-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "printer_station" VARCHAR(40) NOT NULL DEFAULT 'kitchen';

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "spice_level" VARCHAR(40),
ADD COLUMN     "variant_group" VARCHAR(80),
ADD COLUMN     "variant_label" VARCHAR(60);

-- AlterTable
ALTER TABLE "outlets" ADD COLUMN     "printer_stations" JSONB,
ADD COLUMN     "qris_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "service_mode" VARCHAR(30) NOT NULL DEFAULT 'SELF_PICKUP_PAGER',
ADD COLUMN     "stock_reminder_hours" SMALLINT[] DEFAULT ARRAY[11, 15, 18]::SMALLINT[],
ADD COLUMN     "telegram_bot_token" VARCHAR(200),
ADD COLUMN     "telegram_chat_id" VARCHAR(64),
ADD COLUMN     "whatsapp_webhook_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "promos" ADD COLUMN     "max_quantity" INTEGER,
ADD COLUMN     "used_quantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pin_hash" VARCHAR(255);

-- CreateTable
CREATE TABLE "staff_attendances" (
    "id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "clock_in_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clock_out_at" TIMESTAMPTZ,
    "note" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_attendances_outlet_id_clock_in_at_idx" ON "staff_attendances"("outlet_id", "clock_in_at");

-- CreateIndex
CREATE INDEX "staff_attendances_user_id_clock_in_at_idx" ON "staff_attendances"("user_id", "clock_in_at");

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendances" ADD CONSTRAINT "staff_attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
