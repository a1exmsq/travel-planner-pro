ALTER TABLE pois ADD COLUMN IF NOT EXISTS source VARCHAR(40);
ALTER TABLE pois ADD COLUMN IF NOT EXISTS external_source_id VARCHAR(120);
ALTER TABLE pois ADD COLUMN IF NOT EXISTS source_url VARCHAR(500);
ALTER TABLE pois ADD COLUMN IF NOT EXISTS editorial_score INTEGER DEFAULT 0;
ALTER TABLE pois ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;
ALTER TABLE pois ADD COLUMN IF NOT EXISTS visit_minutes INTEGER DEFAULT 60;
ALTER TABLE pois ADD COLUMN IF NOT EXISTS price_level INTEGER DEFAULT 0;
ALTER TABLE pois ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;
ALTER TABLE pois ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE pois ADD COLUMN IF NOT EXISTS import_batch VARCHAR(80);

CREATE TABLE IF NOT EXISTS poi_tags (
    poi_id BIGINT NOT NULL,
    tag VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pois_global_city_usage ON pois (is_global, city_id, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_pois_global_featured ON pois (is_global, featured, editorial_score DESC, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_pois_source ON pois (source);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pois_source_external ON pois (source, external_source_id)
    WHERE external_source_id IS NOT NULL;

UPDATE pois
SET source = CASE WHEN is_global THEN 'seed' ELSE 'user' END
WHERE source IS NULL;

UPDATE pois
SET verified = CASE WHEN is_global THEN TRUE ELSE FALSE END
WHERE verified IS NULL;

UPDATE pois
SET featured = CASE
    WHEN is_global AND category IN ('Landmark', 'Museum', 'Religious', 'Park', 'Viewpoint') THEN TRUE
    ELSE FALSE
END
WHERE featured IS NULL;

UPDATE pois
SET quality_score = LEAST(
    100,
    GREATEST(
        30,
        ROUND(COALESCE(rating, 0) * 18)::INTEGER + LEAST(COALESCE(usage_count, 0) * 2, 20)
    )
)
WHERE COALESCE(quality_score, 0) = 0;

UPDATE pois
SET editorial_score = CASE
    WHEN featured THEN GREATEST(COALESCE(quality_score, 60), 82)
    WHEN is_global THEN GREATEST(COALESCE(quality_score, 50), 64)
    ELSE 38
END
WHERE COALESCE(editorial_score, 0) = 0;

UPDATE pois
SET visit_minutes = CASE
    WHEN category = 'Museum' THEN 120
    WHEN category = 'Park' THEN 75
    WHEN category = 'Cafe' THEN 45
    WHEN category = 'Religious' THEN 60
    WHEN category = 'Viewpoint' THEN 40
    ELSE 60
END
WHERE COALESCE(visit_minutes, 0) = 0;

UPDATE cities c
SET poi_count = COALESCE((
    SELECT COUNT(*)
    FROM pois p
    WHERE p.city_id = c.id
      AND p.is_global = TRUE
), 0);

UPDATE countries country_row
SET cities_count = COALESCE((
    SELECT COUNT(*)
    FROM cities city_row
    WHERE city_row.country_id = country_row.id
), 0);

UPDATE countries country_row
SET poi_count = COALESCE((
    SELECT COUNT(*)
    FROM pois p
    JOIN cities city_row ON city_row.id = p.city_id
    WHERE city_row.country_id = country_row.id
      AND p.is_global = TRUE
), 0);

UPDATE continents continent_row
SET countries_count = COALESCE((
    SELECT COUNT(*)
    FROM countries country_row
    WHERE country_row.continent_id = continent_row.id
), 0);
