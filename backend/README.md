# Backend — Spring Boot REST API

Java 21 · Spring Boot 3 · Spring Security (JWT) · JPA / Hibernate · PostgreSQL · Docker

---

## Requirements

| Tool | Version |
|------|---------|
| Java | 21+ |
| Maven | 3.9+ (or use `./mvnw`) |
| Docker | any recent |
| Docker Compose | v2+ |

---

## Quick Start

### 1. Start PostgreSQL with Docker

```bash
docker-compose up -d
```

This starts a PostgreSQL 15 container on port `5432`.  
Data is persisted in a named Docker volume — it survives container restarts.

To stop:
```bash
docker-compose down
```

To stop and delete all data:
```bash
docker-compose down -v
```

---

### 2. Configure environment variables

Copy the example file:
```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
# Database — must match docker-compose.yml values
DB_URL=jdbc:postgresql://localhost:5432/travel_planner
DB_USERNAME=admin
DB_PASSWORD=your_secure_password          # choose any password

# JWT — used to sign/verify tokens; must be at least 32 characters
JWT_SECRET=change-this-to-a-long-random-string-min-32
JWT_EXPIRATION_MS=86400000                # 24 hours in ms

# OpenAI — optional; without it the app uses the algorithmic fallback
OPENAI_API_KEY=sk-proj-...                # get at platform.openai.com

# CORS — frontend origin allowed to call the API
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Server
SERVER_PORT=8080
```

> ⚠️ Never commit `.env` to git — it is already in `.gitignore`

---

### 3. Run the application

```bash
./mvnw spring-boot:run
```

On Windows:
```bash
mvnw.cmd spring-boot:run
```

The API starts at **http://localhost:8080**

---

## Project Structure

```
src/main/java/com/travel/planner/
├── config/          # SecurityConfig, WebConfig, CORS
├── controller/      # REST controllers (one per resource)
├── dto/             # Request/Response data transfer objects
├── entity/          # JPA entities (DB tables)
├── repository/      # Spring Data JPA repositories
├── security/        # JwtService, JwtAuthFilter
└── service/         # Business logic
    ├── AiRouteService.java       # OpenAI integration + algorithmic fallback
    ├── OsmImportService.java     # Overpass API → POI import
    ├── RouteOptimizerService.java # Nearest-neighbour route optimization
    └── ...
```

---

## Authentication Flow

```
POST /api/auth/register  { email, password, name }
POST /api/auth/login     { email, password }
  └─→ { token: "eyJ..." }        ← JWT, valid 24h by default
```

Include the token in every protected request:
```
Authorization: Bearer eyJ...
```

The frontend stores it in `localStorage` and attaches it automatically via axios interceptor.

---

## Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ✗ | Create account |
| POST | `/api/auth/login` | ✗ | Get JWT token |
| GET | `/api/cities` | ✗ | List cities |
| GET | `/api/pois?cityId={id}` | ✗ | POIs for a city |
| POST | `/api/osm/import/{cityId}` | admin | Import POIs from OpenStreetMap |
| POST | `/api/routes` | ✓ | Create route |
| POST | `/api/routes/{id}/optimize` | ✓ | Optimize stop order |
| POST | `/api/ai/generate` | ✓ | Generate AI itinerary |

---

## OpenAI / AI Itinerary

The AI feature works in two modes:

**With API key** (`OPENAI_API_KEY` set in `.env`):
- Sends up to 60 best-ranked POIs to GPT-4o-mini
- Model returns a structured JSON itinerary

**Without API key** (dev/demo mode):
- Falls back to a deterministic algorithm
- Selects POIs by interest match and quality score
- Still returns a valid itinerary — no errors shown to user

To get an OpenAI key: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## First Run: Import POI Data

After starting the app, import points of interest for a city (requires admin account):

```bash
curl -X POST http://localhost:8080/api/osm/import/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Replace `1` with the city ID. This fetches up to 250 POIs from OpenStreetMap
within a 3.5 km radius of the city centre.

---

## Running Tests

```bash
./mvnw test
```

---

## docker-compose.yml overview

```yaml
services:
  postgres:
    image: postgres:15
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: travel_planner
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

The app connects via `DB_URL` from `.env`. Spring Boot + Hibernate create
all tables automatically on first start (`spring.jpa.hibernate.ddl-auto=update`).
