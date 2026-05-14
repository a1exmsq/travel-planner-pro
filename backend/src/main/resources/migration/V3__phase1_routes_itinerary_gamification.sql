ALTER TABLE routes ADD COLUMN IF NOT EXISTS total_distance_km DOUBLE PRECISION DEFAULT 0;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER DEFAULT 0;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS is_optimized BOOLEAN DEFAULT FALSE;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS number_of_days INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS route_collaborators (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(32) NOT NULL,
    invited_at TIMESTAMP,
    accepted_at TIMESTAMP,
    status VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS route_invitations (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL,
    invited_by_id BIGINT NOT NULL,
    invited_user_id BIGINT NOT NULL,
    role VARCHAR(32) NOT NULL,
    invite_code VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP,
    status VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS route_days (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL,
    day_number INTEGER NOT NULL,
    date DATE,
    title VARCHAR(255),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS day_activities (
    id BIGSERIAL PRIMARY KEY,
    route_day_id BIGINT NOT NULL,
    route_poi_id BIGINT NOT NULL,
    order_index INTEGER NOT NULL,
    start_time TIME,
    duration_minutes INTEGER,
    activity_type VARCHAR(32),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS achievements (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(64),
    points INTEGER NOT NULL,
    rarity VARCHAR(32) NOT NULL,
    type VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    achievement_id BIGINT NOT NULL,
    unlocked_at TIMESTAMP,
    progress INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_stats (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    routes_created INTEGER DEFAULT 0,
    countries_visited INTEGER DEFAULT 0,
    cities_visited INTEGER DEFAULT 0,
    pois_added INTEGER DEFAULT 0,
    total_distance_traveled DOUBLE PRECISION DEFAULT 0,
    current_streak INTEGER DEFAULT 0
);
