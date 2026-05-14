ALTER TABLE routes
    ALTER COLUMN main_image_url TYPE TEXT;

ALTER TABLE pois
    ALTER COLUMN image_url TYPE TEXT;

ALTER TABLE pois
    ALTER COLUMN main_image_url TYPE TEXT;

ALTER TABLE poi_images
    ALTER COLUMN image_url TYPE TEXT;

ALTER TABLE route_media
    ALTER COLUMN media_url TYPE TEXT;
