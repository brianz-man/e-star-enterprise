CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "products_search_vector_idx"
ON "products" USING GIN ("search_vector");

CREATE INDEX IF NOT EXISTS "products_name_trgm_idx"
ON "products" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_description_trgm_idx"
ON "products" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_sku_trgm_idx"
ON "products" USING GIN ("sku" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "printer_compatibility_printerModel_trgm_idx"
ON "printer_compatibility" USING GIN ("printerModel" gin_trgm_ops);
