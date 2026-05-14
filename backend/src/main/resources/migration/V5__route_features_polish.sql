CREATE TABLE IF NOT EXISTS route_packing_items (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL,
    title VARCHAR(160) NOT NULL,
    category VARCHAR(64) NOT NULL,
    notes VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    is_packed BOOLEAN DEFAULT FALSE,
    required_for VARCHAR(64),
    order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS route_journal_entries (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL,
    entry_date DATE NOT NULL,
    title VARCHAR(160) NOT NULL,
    story TEXT,
    location_label VARCHAR(160),
    mood VARCHAR(48),
    highlight VARCHAR(255),
    favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_journal_entry_media (
    journal_entry_id BIGINT NOT NULL,
    media_url VARCHAR(255)
);
