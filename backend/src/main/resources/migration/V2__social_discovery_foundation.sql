ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_type VARCHAR(32);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS primary_country_id BIGINT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS primary_city_id BIGINT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS region_label VARCHAR(120);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS location_summary VARCHAR(255);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS forked_from_route_id BIGINT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS original_route_id BIGINT;

CREATE TABLE IF NOT EXISTS route_vibe_tags (
    route_id BIGINT NOT NULL,
    tag VARCHAR(32)
);

CREATE TABLE IF NOT EXISTS route_collections (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS route_collection_items (
    id BIGSERIAL PRIMARY KEY,
    collection_id BIGINT NOT NULL,
    route_id BIGINT NOT NULL
);
