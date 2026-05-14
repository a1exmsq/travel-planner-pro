-- Safety migration: ensure continents table has all required columns
-- The continents table was created by Hibernate's ddl-auto before Flyway was added.
-- If the entity was updated after initial schema creation, these columns might be absent.

ALTER TABLE continents ADD COLUMN IF NOT EXISTS routes_count INTEGER DEFAULT 0;
ALTER TABLE continents ADD COLUMN IF NOT EXISTS countries_count INTEGER DEFAULT 0;

-- Backfill countries_count for any continents where it is still 0
UPDATE continents c
SET countries_count = COALESCE((
    SELECT COUNT(*)
    FROM countries co
    WHERE co.continent_id = c.id
), 0)
WHERE COALESCE(c.countries_count, 0) = 0;

-- Backfill routes_count for any continents where it is still 0
UPDATE continents c
SET routes_count = COALESCE((
    SELECT COUNT(*)
    FROM routes r
    JOIN countries co ON co.id = r.primary_country_id
    WHERE co.continent_id = c.id
      AND r.is_public = TRUE
), 0)
WHERE COALESCE(c.routes_count, 0) = 0;
