CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "products"
ADD COLUMN "search_vector" tsvector;

CREATE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."search_vector" :=
    setweight(to_tsvector('simple', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."description", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."sku", '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_vector_update_trigger
BEFORE INSERT OR UPDATE OF "name", "description", "sku"
ON "products"
FOR EACH ROW
EXECUTE FUNCTION products_search_vector_update();

UPDATE "products"
SET "search_vector" =
  setweight(to_tsvector('simple', coalesce("name", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("description", '')), 'B') ||
  setweight(to_tsvector('simple', coalesce("sku", '')), 'C');

CREATE INDEX "products_search_vector_idx"
ON "products" USING GIN ("search_vector");

CREATE INDEX "products_name_trgm_idx"
ON "products" USING GIN ("name" gin_trgm_ops);

CREATE INDEX "products_description_trgm_idx"
ON "products" USING GIN ("description" gin_trgm_ops);

CREATE INDEX "products_sku_trgm_idx"
ON "products" USING GIN ("sku" gin_trgm_ops);

CREATE INDEX "printer_compatibility_printerModel_trgm_idx"
ON "printer_compatibility" USING GIN ("printerModel" gin_trgm_ops);

ALTER TABLE "reviews"
ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "reviews" SET "updatedAt" = "createdAt";

ALTER TABLE "reviews"
ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE INDEX "reviews_isDeleted_idx" ON "reviews"("isDeleted");
