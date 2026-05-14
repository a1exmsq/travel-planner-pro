package com.travel.planner.config;

import com.travel.planner.entity.*;
import com.travel.planner.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder {

    private final ContinentRepository continentRepository;
    private final CountryRepository countryRepository;
    private final CityRepository cityRepository;
    private final PointOfInterestRepository poiRepository;
    private final UserRepository userRepository;
    private final RouteRepository routeRepository;
    private final RoutePOIRepository routePOIRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    @Transactional
    public CommandLineRunner seedDatabase() {
        return args -> {
            List<Continent> continents = ensureAllContinents();
            List<Country> countries = ensureAllCountries(continents);
            List<City> cities = ensureAllCities(countries);

            ensureCuratedGlobalPOIs(cities);
            ensureDemoRoutes(cities);
            ensureDemoExplorerHiddenPlaces(cities);
            refreshLocationCounters(continentRepository.findAll(), countryRepository.findAll(), cityRepository.findAll());

            log.info("Database enrichment completed: {} cities / {} pois / {} routes / {} users",
                    cityRepository.count(), poiRepository.count(), routeRepository.count(), userRepository.count());
        };
    }


    private List<Continent> ensureAllContinents() {
        ensureContinent("Europe", "EU", "EU",
                "Rich in history, culture, and architectural depth",
                "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200");
        ensureContinent("Asia", "AS", "AS",
                "Huge, layered, and full of urban contrast",
                "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=1200");
        ensureContinent("North America", "NA", "NA",
                "Iconic cities, road trips, and big landscape changes",
                "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200");
        ensureContinent("South America", "SA", "SA",
                "Dramatic geography and deeply memorable city energy",
                "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200");
        ensureContinent("Africa", "AF", "AF",
                "Wildlife, history, and high-contrast landscapes",
                "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200");
        ensureContinent("Oceania", "OC", "OC",
                "Island culture, surf routes, and open horizons",
                "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200");
        return continentRepository.findAll();
    }

    private void ensureContinent(String name, String code, String emoji, String description, String imageUrl) {
        if (continentRepository.findByCode(code).isPresent()) return;
        Continent continent = new Continent();
        continent.setName(name);
        continent.setCode(code);
        continent.setEmoji(emoji);
        continent.setDescription(description);
        continent.setImageUrl(imageUrl);
        continent.setCountriesCount(0);
        continent.setRoutesCount(0);
        continentRepository.save(continent);
    }

    private List<Country> ensureAllCountries(List<Continent> continents) {
        Continent europe = findContinent(continents, "EU");
        Continent asia = findContinent(continents, "AS");
        Continent northAmerica = findContinent(continents, "NA");

        ensureCountry("Poland", "POL", "PL", europe,
                "Walkable history, warm city centers, and strong hidden-route potential",
                "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=1200");
        ensureCountry("France", "FRA", "FR", europe,
                "Art, cafés, and neighborhoods made for wandering",
                "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200");
        ensureCountry("Germany", "DEU", "DE", europe,
                "Creative districts, culture, and rail-friendly travel",
                "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200");
        ensureCountry("Italy", "ITA", "IT", europe,
                "Ancient landmarks, food culture, and dramatic routes",
                "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=1200");
        ensureCountry("Spain", "ESP", "ES", europe,
                "Architecture, evening energy, and relaxed city rhythm",
                "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1200");
        ensureCountry("Czech Republic", "CZE", "CZ", europe,
                "Fairy-tale old towns, dramatic castles, and a walking culture that rewards every detour",
                "https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200");
        ensureCountry("Netherlands", "NLD", "NL", europe,
                "Canal rings, world-class museums, and one of the most bikeable cities in Europe",
                "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200");
        ensureCountry("Austria", "AUT", "AT", europe,
                "Imperial architecture, café culture, and art museums worth losing a full day in",
                "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200");
        ensureCountry("Portugal", "PRT", "PT", europe,
                "Hilltop viewpoints, tile-covered buildings, and one of Europe's most atmospheric old towns",
                "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200");
        ensureCountry("Japan", "JPN", "JP", asia,
                "Precision, ritual, and incredible city contrast",
                "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=1200");
        ensureCountry("Thailand", "THA", "TH", asia,
                "Street food, temples, and warm-weather spontaneity",
                "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200");
        ensureCountry("United States", "USA", "US", northAmerica,
                "Big icons, neighborhoods, and large-scale trip variety",
                "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=1200");
        return countryRepository.findAll();
    }

    private void ensureCountry(String name, String code, String flagEmoji, Continent continent,
                               String description, String imageUrl) {
        if (countryRepository.findByCode(code).isPresent()) return;
        Country country = new Country();
        country.setName(name);
        country.setCode(code);
        country.setFlagEmoji(flagEmoji);
        country.setContinent(continent);
        country.setDescription(description);
        country.setImageUrl(imageUrl);
        country.setCitiesCount(0);
        country.setRoutesCount(0);
        country.setPoiCount(0);
        countryRepository.save(country);
    }

    private List<City> ensureAllCities(List<Country> countries) {
        Country poland = findCountry(countries, "POL");
        Country france = findCountry(countries, "FRA");
        Country germany = findCountry(countries, "DEU");
        Country italy = findCountry(countries, "ITA");
        Country spain = findCountry(countries, "ESP");
        Country czechia = findCountry(countries, "CZE");
        Country netherlands = findCountry(countries, "NLD");
        Country austria = findCountry(countries, "AUT");
        Country portugal = findCountry(countries, "PRT");
        Country japan = findCountry(countries, "JPN");
        Country thailand = findCountry(countries, "THA");
        Country usa = findCountry(countries, "USA");

        ensureCity("Prague", czechia, 50.0755, 14.4378,
                "A fairy-tale cityscape, medieval squares, and a walking culture that rewards every turn",
                "https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200");
        ensureCity("Warsaw", poland, 52.2297, 21.0122,
                "A resilient capital with strong urban contrast",
                "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=1200");
        ensureCity("Krakow", poland, 50.0647, 19.9450,
                "Medieval depth and easy walking energy",
                "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200");
        ensureCity("Paris", france, 48.8566, 2.3522,
                "The City of Light and endless neighborhood drift",
                "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200");
        ensureCity("Lyon", france, 45.7640, 4.8357,
                "Food-first France with a calmer city rhythm",
                "https://images.unsplash.com/photo-1524041255072-7da0525d6b34?w=1200");
        ensureCity("Berlin", germany, 52.5200, 13.4050,
                "Creative, historic, and full of character",
                "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200");
        ensureCity("Rome", italy, 41.9028, 12.4964,
                "Ancient scale and cinematic routes",
                "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200");
        ensureCity("Florence", italy, 43.7696, 11.2558,
                "Compact Renaissance beauty",
                "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200");
        ensureCity("Barcelona", spain, 41.3851, 2.1734,
                "Gaudi, coast, and strong neighborhood energy",
                "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200");
        ensureCity("Madrid", spain, 40.4168, -3.7038,
                "Museums, plazas, and late-night rhythm",
                "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200");
        ensureCity("Amsterdam", netherlands, 52.3676, 4.9041,
                "Canal rings, bicycles, world-class museums, and golden-hour bridges",
                "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200");
        ensureCity("Vienna", austria, 48.2082, 16.3738,
                "Imperial palaces, famous coffee houses, and an art scene that spans centuries",
                "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200");
        ensureCity("Lisbon", portugal, 38.7223, -9.1393,
                "Hilltop viewpoints, azulejo tiles, and one of Europe's most atmospheric waterfronts",
                "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200");
        ensureCity("Tokyo", japan, 35.6762, 139.6503,
                "Dense, precise, and full of surprise",
                "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200");
        ensureCity("Kyoto", japan, 35.0116, 135.7681,
                "Temple paths, gardens, and quiet detail",
                "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200");
        ensureCity("Bangkok", thailand, 13.7563, 100.5018,
                "Street food, temples, and rooftop nights",
                "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200");
        ensureCity("New York", usa, 40.7128, -74.0060,
                "Icons, neighborhoods, and endless route combinations",
                "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200");
        ensureCity("San Francisco", usa, 37.7749, -122.4194,
                "Bay views, hills, and compact discovery",
                "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200");
        return cityRepository.findAll();
    }

    private void ensureCity(String name, Country country, double latitude, double longitude,
                            String description, String imageUrl) {
        if (cityRepository.findFirstByNameIgnoreCase(name).isPresent()) return;
        City city = new City();
        city.setName(name);
        city.setCountry(country);
        city.setLatitude(latitude);
        city.setLongitude(longitude);
        city.setDescription(description);
        city.setImageUrl(imageUrl);
        city.setRoutesCount(0);
        city.setPoiCount(0);
        city.setGalleryUrls(new ArrayList<>());
        cityRepository.save(city);
    }

    private void ensureCuratedGlobalPOIs(List<City> cities) {
        seedParisPOIs(findCity(cities, "Paris"));
        seedKrakowPOIs(findCity(cities, "Krakow"));
        seedBerlinPOIs(findCity(cities, "Berlin"));
        seedRomePOIs(findCity(cities, "Rome"));
        seedBarcelonaPOIs(findCity(cities, "Barcelona"));
        seedTokyoPOIs(findCity(cities, "Tokyo"));
        seedKyotoPOIs(findCity(cities, "Kyoto"));
        seedNewYorkPOIs(findCity(cities, "New York"));
        seedSanFranciscoPOIs(findCity(cities, "San Francisco"));
        seedPraguePOIs(findCity(cities, "Prague"));
        seedAmsterdamPOIs(findCity(cities, "Amsterdam"));
        seedViennaPOIs(findCity(cities, "Vienna"));
        seedLisbonPOIs(findCity(cities, "Lisbon"));
    }

    private void seedParisPOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Eiffel Tower", "Landmark", 48.8584, 2.2945,
                "An icon from every angle, especially good at blue hour.",
                "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800",
                true, 75, 2, "landmark", "sunset", "classic");
        ensureGlobalPoi(city, "Louvre Museum", "Museum", 48.8606, 2.3376,
                "A major cultural anchor with enough scale to shape a whole day.",
                "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800",
                true, 150, 3, "art", "museum");
        ensureGlobalPoi(city, "Montmartre Steps", "Viewpoint", 48.8867, 2.3431,
                "A hilltop route layer with city views and slower neighborhood energy.",
                "https://images.unsplash.com/photo-1522093007474-d86e9bf7ba6f?w=800",
                true, 60, 0, "viewpoint", "walk");
        ensureGlobalPoi(city, "Jardin du Luxembourg", "Park", 48.8462, 2.3372,
                "One of the easiest ways to add breathing room into a dense Paris day.",
                "https://images.unsplash.com/photo-1520637836862-4d197d17c13a?w=800",
                true, 55, 0, "park", "calm");
        ensureGlobalPoi(city, "Musée d'Orsay", "Museum", 48.8600, 2.3266,
                "The impressionist collection alone justifies a long visit.",
                "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=800",
                true, 120, 3, "art", "impressionism");
        ensureGlobalPoi(city, "Notre-Dame Cathedral", "Religious", 48.8530, 2.3499,
                "A Gothic anchor of the city, still striking from the riverbanks.",
                "https://images.unsplash.com/photo-1464817739973-0128fe77aaa1?w=800",
                true, 45, 0, "gothic", "history");
    }

    private void seedKrakowPOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Main Market Square", "Landmark", 50.0617, 19.9373,
                "A readable historic core that makes Krakow welcoming almost instantly.",
                "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800",
                true, 60, 0, "historic", "core");
        ensureGlobalPoi(city, "Wawel Castle", "Landmark", 50.0541, 19.9352,
                "A route-defining castle stop with real visual weight.",
                "https://images.unsplash.com/photo-1602192509154-0b900ee1f851?w=800",
                true, 90, 2, "castle", "history");
        ensureGlobalPoi(city, "Kazimierz Streets", "Landmark", 50.0514, 19.9448,
                "The neighborhood layer that gives Krakow its evening personality.",
                "https://images.unsplash.com/photo-1544989164-31d2f2e04d13?w=800",
                true, 60, 1, "neighborhood", "food");
        ensureGlobalPoi(city, "St. Mary's Basilica", "Religious", 50.0617, 19.9394,
                "Gothic towers dominating the square with hourly trumpet calls.",
                "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800",
                true, 45, 1, "gothic", "church");
    }

    private void seedBerlinPOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Brandenburg Gate", "Landmark", 52.5163, 13.3777,
                "The most obvious historical anchor and still worth building around.",
                "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800",
                true, 40, 0, "icon", "history");
        ensureGlobalPoi(city, "Museum Island", "Museum", 52.5169, 13.4010,
                "A dense culture cluster that gives one stop a lot of weight.",
                "https://images.unsplash.com/photo-1548786811-dd6e453ccca7?w=800",
                true, 150, 2, "museum", "culture");
        ensureGlobalPoi(city, "East Side Gallery", "Street Art", 52.5050, 13.4399,
                "A long-form street art stop with strong route payoff.",
                "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800",
                true, 50, 0, "street-art", "open-air");
        ensureGlobalPoi(city, "Tempelhofer Feld", "Park", 52.4730, 13.4039,
                "A huge open-space reset inside the city.",
                "https://images.unsplash.com/photo-1494526585095-c41746248156?w=800",
                true, 70, 0, "park", "local");
        ensureGlobalPoi(city, "Checkpoint Charlie", "Landmark", 52.5075, 13.3904,
                "A Cold War landmark that still carries its historical tension well.",
                "https://images.unsplash.com/photo-1587330979470-3595ac045ab0?w=800",
                true, 30, 0, "history", "cold-war");
        ensureGlobalPoi(city, "Reichstag Building", "Landmark", 52.5186, 13.3762,
                "Glass dome rooftop with a 360° view of the capital.",
                "https://images.unsplash.com/photo-1587330979470-3595ac045ab0?w=800",
                true, 60, 0, "parliament", "architecture");
    }

    private void seedRomePOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Colosseum", "Landmark", 41.8902, 12.4922,
                "Ancient scale and one of the strongest visual anchors in Europe.",
                "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800",
                true, 90, 2, "ancient", "icon");
        ensureGlobalPoi(city, "Trevi Fountain", "Landmark", 41.9009, 12.4833,
                "Crowded but still emotionally effective at the right hour.",
                "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800",
                true, 35, 0, "fountain", "classic");
        ensureGlobalPoi(city, "Vatican Museums", "Museum", 41.9065, 12.4536,
                "A major culture block that can define the whole day.",
                "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800",
                true, 160, 3, "museum", "art");
        ensureGlobalPoi(city, "Trastevere Streets", "Landmark", 41.8897, 12.4708,
                "A warmer neighborhood layer for food, strolling, and evening energy.",
                "https://images.unsplash.com/photo-1525874684015-58379d421a52?w=800",
                true, 60, 1, "neighborhood", "food");
        ensureGlobalPoi(city, "Roman Forum", "Landmark", 41.8925, 12.4853,
                "The civic heart of ancient Rome, best combined with the Colosseum.",
                "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800",
                true, 75, 2, "ancient", "ruins");
        ensureGlobalPoi(city, "Pantheon", "Landmark", 41.8986, 12.4769,
                "One of the best-preserved ancient structures with a stunning oculus.",
                "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800",
                true, 40, 0, "ancient", "architecture");
    }

    private void seedBarcelonaPOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Sagrada Familia", "Religious", 41.4036, 2.1744,
                "A route-defining icon with enough detail to feel new each time.",
                "https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?w=800",
                true, 80, 2, "gaudi", "icon");
        ensureGlobalPoi(city, "Park Guell", "Park", 41.4145, 2.1527,
                "Architecture and viewpoint payoff in the same stop.",
                "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800",
                true, 75, 1, "gaudi", "park");
        ensureGlobalPoi(city, "Gothic Quarter", "Landmark", 41.3839, 2.1763,
                "The easiest way to make the route feel textured and old-world.",
                "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=800",
                true, 70, 0, "old-town", "walk");
        ensureGlobalPoi(city, "Bunkers del Carmel", "Viewpoint", 41.4180, 2.1527,
                "A much stronger panorama than many first-time plans allow for.",
                "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800",
                true, 45, 0, "viewpoint", "sunset");
        ensureGlobalPoi(city, "La Barceloneta Beach", "Viewpoint", 41.3783, 2.1925,
                "The natural reset at the end of a city-dense day.",
                "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
                true, 60, 0, "beach", "relax");
    }

    private void seedTokyoPOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Senso-ji Temple", "Religious", 35.7148, 139.7967,
                "An atmospheric spiritual anchor with strong surrounding street energy.",
                "https://images.unsplash.com/photo-1528164344705-47542687000d?w=800",
                true, 60, 0, "temple", "historic");
        ensureGlobalPoi(city, "Shibuya Crossing", "Landmark", 35.6595, 139.7004,
                "An obvious icon, but still one of the best ways to feel the city at full speed.",
                "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800",
                true, 25, 0, "icon", "night");
        ensureGlobalPoi(city, "Meiji Shrine", "Religious", 35.6764, 139.6993,
                "A quiet contrast stop that slows the route down in the right way.",
                "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800",
                true, 55, 0, "shrine", "calm");
        ensureGlobalPoi(city, "Yanaka Ginza", "Landmark", 35.7278, 139.7662,
                "A more human-scale Tokyo layer with local street texture.",
                "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=800",
                true, 50, 1, "local", "street");
        ensureGlobalPoi(city, "Shinjuku Gyoen Garden", "Park", 35.6851, 139.7103,
                "One of Tokyo's best parks — especially during cherry blossom season.",
                "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
                true, 70, 1, "park", "garden");
    }

    private void seedKyotoPOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Fushimi Inari Taisha", "Religious", 34.9671, 135.7727,
                "One of the most iconic paths in Japan and still worth an early start.",
                "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800",
                true, 90, 0, "temple", "hike");
        ensureGlobalPoi(city, "Kiyomizu-dera", "Religious", 34.9949, 135.7850,
                "A classic Kyoto viewpoint with strong payoff even on a first visit.",
                "https://images.unsplash.com/photo-1526481280695-3c4691c2b5b0?w=800",
                true, 70, 1, "temple", "viewpoint");
        ensureGlobalPoi(city, "Arashiyama Bamboo Grove", "Park", 35.0170, 135.6713,
                "A high-appeal nature stop that photographs beautifully.",
                "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800",
                true, 60, 0, "nature", "walk");
        ensureGlobalPoi(city, "Gion District", "Landmark", 35.0038, 135.7783,
                "The geisha quarter, best explored in the late afternoon light.",
                "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800",
                true, 70, 0, "historic", "evening");
    }

    private void seedNewYorkPOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Statue of Liberty", "Landmark", 40.6892, -74.0445,
                "A classic anchor that still works well with Lower Manhattan.",
                "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=800",
                true, 90, 2, "icon", "harbor");
        ensureGlobalPoi(city, "Central Park", "Park", 40.7829, -73.9654,
                "The easiest way to make a dense city route breathe.",
                "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800",
                true, 80, 0, "park", "slow");
        ensureGlobalPoi(city, "Brooklyn Bridge Walk", "Viewpoint", 40.7061, -73.9969,
                "One of the strongest movement-based experiences in the city.",
                "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800",
                true, 50, 0, "walk", "viewpoint");
        ensureGlobalPoi(city, "DUMBO Waterfront", "Viewpoint", 40.7033, -73.9881,
                "A skyline payoff that makes the route feel more cinematic.",
                "https://images.unsplash.com/photo-1494526585095-c41746248156?w=800",
                true, 45, 1, "skyline", "photo");
        ensureGlobalPoi(city, "The High Line", "Park", 40.7480, -74.0048,
                "An elevated park that threads through the Meatpacking District.",
                "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800",
                true, 60, 0, "park", "urban");
    }

    private void seedSanFranciscoPOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Golden Gate Bridge", "Landmark", 37.8199, -122.4783,
                "Still the strongest city icon when the weather opens up.",
                "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800",
                true, 70, 0, "icon", "bridge");
        ensureGlobalPoi(city, "Alamo Square", "Viewpoint", 37.7764, -122.4346,
                "A compact city-view stop with a strong visual payoff.",
                "https://images.unsplash.com/photo-1494526585095-c41746248156?w=800",
                true, 35, 0, "viewpoint", "photo");
        ensureGlobalPoi(city, "Ferry Building", "Cafe", 37.7955, -122.3937,
                "A very reliable food anchor for route pacing.",
                "https://images.unsplash.com/photo-1481833761820-0509d3217039?w=800",
                true, 45, 2, "food", "market");
        ensureGlobalPoi(city, "Lands End Trail", "Park", 37.7802, -122.5130,
                "A stronger nature-layer stop than many city plans allow for.",
                "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800",
                true, 80, 0, "trail", "nature");
    }

    private void seedPraguePOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Charles Bridge", "Landmark", 50.0865, 14.4114,
                "A 14th-century bridge lined with baroque statues, best at dawn when the fog rolls in.",
                "https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=800",
                true, 45, 0, "bridge", "historic", "icon");
        ensureGlobalPoi(city, "Old Town Square", "Landmark", 50.0875, 14.4213,
                "The beating heart of Prague with the Astronomical Clock and Gothic towers all in one frame.",
                "https://images.unsplash.com/photo-1541849546-216549ae216d?w=800",
                true, 60, 0, "historic", "square", "clock");
        ensureGlobalPoi(city, "Prague Castle", "Landmark", 50.0909, 14.4000,
                "The largest ancient castle complex in the world, visible from almost everywhere in the city.",
                "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800",
                true, 120, 2, "castle", "history", "panorama");
        ensureGlobalPoi(city, "Josefov Jewish Quarter", "Museum", 50.0900, 14.4174,
                "Six synagogues and the old cemetery — one of the most significant Jewish heritage sites in Europe.",
                "https://images.unsplash.com/photo-1541849546-216549ae216d?w=800",
                true, 90, 2, "history", "museum", "heritage");
        ensureGlobalPoi(city, "Vinohrady Neighborhood", "Landmark", 50.0752, 14.4416,
                "Art Nouveau streets, local cafés, and a quieter side of Prague that most first-timers miss.",
                "https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=800",
                true, 60, 0, "local", "neighborhood", "cafe");
        ensureGlobalPoi(city, "Letná Park", "Viewpoint", 50.0973, 14.4198,
                "A riverside park with a famous beer garden and one of Prague's best panoramic views.",
                "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800",
                true, 50, 0, "park", "viewpoint", "sunset");
    }

    private void seedAmsterdamPOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Rijksmuseum", "Museum", 52.3600, 4.8852,
                "The Netherlands' national museum and home to Rembrandt and Vermeer — worth a full morning.",
                "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=800",
                true, 150, 3, "art", "rembrandt", "museum");
        ensureGlobalPoi(city, "Anne Frank House", "Museum", 52.3752, 4.8840,
                "A profound and deeply moving historic site that changes how you see the city.",
                "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800",
                true, 90, 2, "history", "wwii", "memorial");
        ensureGlobalPoi(city, "Jordaan Canal Walk", "Viewpoint", 52.3748, 4.8816,
                "The most picturesque neighborhood in Amsterdam — narrow houses, flower markets, local cafés.",
                "https://images.unsplash.com/photo-1468078809804-4c7b3e60a478?w=800",
                true, 75, 0, "canal", "walk", "neighborhood");
        ensureGlobalPoi(city, "Vondelpark", "Park", 52.3580, 4.8686,
                "Amsterdam's largest park — ideal midday reset between museum blocks.",
                "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800",
                true, 60, 0, "park", "relax", "local");
        ensureGlobalPoi(city, "Van Gogh Museum", "Museum", 52.3584, 4.8811,
                "The world's largest Van Gogh collection in a perfectly curated space.",
                "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=800",
                true, 120, 3, "art", "van-gogh", "museum");
        ensureGlobalPoi(city, "Albert Cuyp Market", "Cafe", 52.3545, 4.8977,
                "The largest outdoor market in the Netherlands — street food, fresh produce, local energy.",
                "https://images.unsplash.com/photo-1481833761820-0509d3217039?w=800",
                true, 60, 1, "market", "food", "local");
    }

    private void seedViennaPOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Schönbrunn Palace", "Landmark", 48.1845, 16.3122,
                "The Habsburg summer palace with formal gardens and hilltop views of the city.",
                "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800",
                true, 120, 2, "palace", "history", "gardens");
        ensureGlobalPoi(city, "Belvedere Palace", "Museum", 48.1914, 16.3808,
                "Home to Klimt's The Kiss — a museum that justifies the entire Vienna trip.",
                "https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=800",
                true, 120, 3, "art", "klimt", "palace");
        ensureGlobalPoi(city, "St. Stephen's Cathedral", "Religious", 48.2083, 16.3731,
                "The Gothic centerpiece of the city, dominating the first square most visitors reach.",
                "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800",
                true, 60, 0, "gothic", "cathedral", "icon");
        ensureGlobalPoi(city, "Naschmarkt", "Cafe", 48.1996, 16.3628,
                "Vienna's famous open-air market — 300m of stalls, spices, and some of the best coffee stops.",
                "https://images.unsplash.com/photo-1481833761820-0509d3217039?w=800",
                true, 75, 1, "market", "food", "local");
        ensureGlobalPoi(city, "Prater & Riesenrad", "Landmark", 48.2165, 16.3962,
                "Vienna's historic amusement park with the iconic giant Ferris wheel dating to 1897.",
                "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800",
                true, 90, 1, "ferris-wheel", "historic", "views");
        ensureGlobalPoi(city, "Kunsthistorisches Museum", "Museum", 48.2033, 16.3616,
                "One of the world's most impressive art history collections in an imperial palace setting.",
                "https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=800",
                true, 150, 3, "art", "history", "imperial");
    }

    private void seedLisbonPOIs(City city) {
        if (city == null) return;
        ensureGlobalPoi(city, "Belém Tower", "Landmark", 38.6916, -9.2160,
                "A 16th-century fortress at the mouth of the Tagus — one of Lisbon's most photographed spots.",
                "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800",
                true, 60, 1, "fortress", "history", "river");
        ensureGlobalPoi(city, "Alfama District", "Landmark", 38.7140, -9.1318,
                "Lisbon's oldest neighborhood — narrow alleys, azulejo tiles, and fado music floating out of windows.",
                "https://images.unsplash.com/photo-1513618827672-0d7c5ad591b1?w=800",
                true, 90, 0, "neighborhood", "fado", "tiles");
        ensureGlobalPoi(city, "Jerónimos Monastery", "Religious", 38.6978, -9.2063,
                "A masterpiece of Manueline architecture and the tomb of Vasco da Gama.",
                "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800",
                true, 90, 2, "monastery", "history", "architecture");
        ensureGlobalPoi(city, "São Jorge Castle", "Landmark", 38.7139, -9.1337,
                "A Moorish hilltop castle with panoramic views over the terracotta rooftops.",
                "https://images.unsplash.com/photo-1513618827672-0d7c5ad591b1?w=800",
                true, 75, 2, "castle", "moorish", "panorama");
        ensureGlobalPoi(city, "LX Factory", "Street Art", 38.7032, -9.1761,
                "A creative hub in a repurposed industrial space — markets, cafés, and galleries.",
                "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800",
                true, 75, 0, "creative", "market", "local");
        ensureGlobalPoi(city, "Miradouro da Graça", "Viewpoint", 38.7172, -9.1320,
                "One of Lisbon's lesser-known viewpoints with some of the best sunset positions in the city.",
                "https://images.unsplash.com/photo-1513618827672-0d7c5ad591b1?w=800",
                true, 40, 0, "viewpoint", "sunset", "panorama");
    }

    private void ensureDemoRoutes(List<City> cities) {
        User demoUser = userRepository.findByEmail("demo@travelplanner.pro")
                .orElseGet(() -> {
                    User user = new User();
                    user.setUsername("demo");
                    user.setEmail("demo@travelplanner.pro");
                    user.setPassword(passwordEncoder.encode("travel123"));
                    user.setRole("USER");
                    user.setPoints(980);
                    return userRepository.save(user);
                });

        createRouteIfMissing(
                "Berlin Creative Walk", demoUser,
                findCity(cities, "Berlin"),
                RouteType.CITY,
                "A full day through Berlin's most layered history — Cold War, classical culture, and street art collide in a compact route that shows why the city is unlike anywhere else in Europe.",
                "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200",
                Set.of("history", "street-art", "culture"),
                8.5, 240, 14,
                List.of("Brandenburg Gate", "Reichstag Building", "Museum Island", "East Side Gallery", "Tempelhofer Feld")
        );

        createRouteIfMissing(
                "Prague Historical Walk", demoUser,
                findCity(cities, "Prague"),
                RouteType.CITY,
                "Prague's medieval core laid out as a walking day — Charles Bridge at dawn, the castle by mid-morning, and the Jewish Quarter before the afternoon crowds arrive. This is the route that makes people want to come back.",
                "https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200",
                Set.of("history", "architecture", "medieval"),
                5.5, 210, 13,
                List.of("Charles Bridge", "Old Town Square", "Prague Castle", "Josefov Jewish Quarter", "Letná Park")
        );

        createRouteIfMissing(
                "Barcelona Gaudi Discovery", demoUser,
                findCity(cities, "Barcelona"),
                RouteType.CITY,
                "Gaudí as a full-day route — not just Sagrada Família, but Park Güell's mosaic terraces, the Gothic Quarter's labyrinth, and sunset from the bunkers where the whole city opens up.",
                "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200",
                Set.of("architecture", "gaudi", "art"),
                10.0, 270, 12,
                List.of("Sagrada Familia", "Park Guell", "Gothic Quarter", "Bunkers del Carmel", "La Barceloneta Beach")
        );

        createRouteIfMissing(
                "Paris Classics Day", demoUser,
                findCity(cities, "Paris"),
                RouteType.CITY,
                "The Paris everyone should see at least once — but paced properly. Eiffel at golden hour, the Louvre before the afternoon rush, Montmartre for the views, Luxembourg for the reset. One full day, done right.",
                "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200",
                Set.of("culture", "art", "classic"),
                11.0, 340, 14,
                List.of("Eiffel Tower", "Louvre Museum", "Musée d'Orsay", "Montmartre Steps", "Jardin du Luxembourg")
        );

        createRouteIfMissing(
                "Tokyo Essential Loop", demoUser,
                findCity(cities, "Tokyo"),
                RouteType.CITY,
                "Four contrasts that explain Tokyo better than any guidebook: ancient temple energy in Asakusa, peak urban density at Shibuya, forest calm at Meiji Shrine, and local back-street life in Yanaka.",
                "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200",
                Set.of("temples", "culture", "urban"),
                14.0, 210, 13,
                List.of("Senso-ji Temple", "Shibuya Crossing", "Meiji Shrine", "Shinjuku Gyoen Garden", "Yanaka Ginza")
        );

        createRouteIfMissing(
                "Rome Ancient Core", demoUser,
                findCity(cities, "Rome"),
                RouteType.CITY,
                "Rome's ancient layer as a proper route — Colosseum, Forum, and Pantheon in the morning; Trevi before the peak crowds; Trastevere in the evening when the city finally feels like it belongs to those inside it.",
                "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200",
                Set.of("ancient", "history", "architecture"),
                7.0, 330, 12,
                List.of("Colosseum", "Roman Forum", "Pantheon", "Trevi Fountain", "Trastevere Streets")
        );

        createRouteIfMissing(
                "Amsterdam Canal Day", demoUser,
                findCity(cities, "Amsterdam"),
                RouteType.CITY,
                "Amsterdam at its best: Rijksmuseum in the morning, Anne Frank House before lunch, the Jordaan for the afternoon, Van Gogh Museum before closing, and the Albert Cuyp Market on the way back.",
                "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200",
                Set.of("art", "history", "canals"),
                6.5, 330, 15,
                List.of("Rijksmuseum", "Anne Frank House", "Jordaan Canal Walk", "Van Gogh Museum", "Albert Cuyp Market")
        );

        createRouteIfMissing(
                "Vienna Imperial Day", demoUser,
                findCity(cities, "Vienna"),
                RouteType.CITY,
                "Vienna's imperial scale made walkable — St. Stephen's in the morning, the Kunsthistorisches at midday, Belvedere for Klimt in the afternoon, and Schönbrunn's hilltop view before dark.",
                "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200",
                Set.of("imperial", "art", "architecture"),
                9.0, 360, 11,
                List.of("St. Stephen's Cathedral", "Kunsthistorisches Museum", "Belvedere Palace", "Naschmarkt", "Schönbrunn Palace")
        );

        createRouteIfMissing(
                "Lisbon Hills & Tiles", demoUser,
                findCity(cities, "Lisbon"),
                RouteType.CITY,
                "Lisbon is a city you climb to understand. Alfama's tangle of alleys, São Jorge's panoramic walls, the monastery at Belém, and a sunset from Graça that frames the whole day perfectly.",
                "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200",
                Set.of("history", "viewpoints", "tiles"),
                8.0, 300, 13,
                List.of("Alfama District", "São Jorge Castle", "Jerónimos Monastery", "Belém Tower", "Miradouro da Graça")
        );
    }

    private void createRouteIfMissing(String name, User user, City city, RouteType type,
                                      String description, String imageUrl,
                                      Set<String> vibeTags, double distKm, int durationMin,
                                      int likeCount, List<String> poiNames) {
        if (city == null) return;
        if (!routeRepository.findPublicByName(name).isEmpty()) return;

        Route route = new Route();
        route.setName(name);
        route.setDescription(description);
        route.setPublic(true);
        route.setRouteType(type);
        route.setPrimaryCity(city);
        route.setPrimaryCountry(city.getCountry());
        route.setUser(user);
        route.setMainImageUrl(imageUrl);
        route.setLocationSummary(city.getName() + ", " + city.getCountry().getName());
        route.setTotalDistanceKm(distKm);
        route.setTotalDurationMinutes(durationMin);
        route.setVibeTags(vibeTags);
        route.setLikeCount(likeCount);
        route = routeRepository.save(route);

        List<PointOfInterest> cityPois = poiRepository.findByCityIdAndIsGlobalTrueOrderByUsageCountDesc(city.getId());
        int orderIdx = 0;
        for (String poiName : poiNames) {
            final String pName = poiName;
            PointOfInterest poi = cityPois.stream()
                    .filter(p -> p.getName() != null && p.getName().equalsIgnoreCase(pName))
                    .findFirst().orElse(null);
            if (poi != null) {
                RoutePOI routePOI = new RoutePOI();
                routePOI.setRoute(route);
                routePOI.setPoi(poi);
                routePOI.setOrderIndex(orderIdx++);
                routePOI.setTravelTimeMinutes(poi.getVisitMinutes() != null ? poi.getVisitMinutes() : 45);
                routePOIRepository.save(routePOI);
                poi.setUsageCount(Optional.ofNullable(poi.getUsageCount()).orElse(0) + 1);
                poiRepository.save(poi);
            }
        }

        city.setRoutesCount(Optional.ofNullable(city.getRoutesCount()).orElse(0) + 1);
        cityRepository.save(city);
        Country country = city.getCountry();
        if (country != null) {
            country.setRoutesCount(Optional.ofNullable(country.getRoutesCount()).orElse(0) + 1);
            countryRepository.save(country);
        }

        log.info("Seeded demo route: '{}'", name);
    }

    private void ensureDemoExplorerHiddenPlaces(List<City> cities) {
        User demoExplorer = userRepository.findByEmail("demo@travelplanner.pro")
                .orElseGet(() -> {
                    User user = new User();
                    user.setUsername("demo");
                    user.setEmail("demo@travelplanner.pro");
                    user.setPassword(passwordEncoder.encode("travel123"));
                    user.setRole("USER");
                    user.setPoints(980);
                    return userRepository.save(user);
                });

        List<User> usersToEnrich = new ArrayList<>(userRepository.findAll());
        if (usersToEnrich.stream().noneMatch(user -> user.getId().equals(demoExplorer.getId()))) {
            usersToEnrich.add(demoExplorer);
        }

        for (User user : usersToEnrich) {
            City paris = findCity(cities, "Paris");
            City rome = findCity(cities, "Rome");
            City barcelona = findCity(cities, "Barcelona");
            City tokyo = findCity(cities, "Tokyo");
            City kyoto = findCity(cities, "Kyoto");
            City sanFrancisco = findCity(cities, "San Francisco");
            City prague = findCity(cities, "Prague");
            City amsterdam = findCity(cities, "Amsterdam");

            if (paris != null) ensureHiddenPoi(user, paris, "Passage Morning Coffee", "Cafe", 48.8711, 2.3435,
                    "A quieter glass-roof passage moment with coffee and low tourist pressure.",
                    "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=800", "coffee", "quiet", "morning");
            if (rome != null) ensureHiddenPoi(user, rome, "Orange Garden Quiet Bench", "Viewpoint", 41.8859, 12.4817,
                    "A calmer panoramic stop than the obvious city lookouts.",
                    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800", "viewpoint", "quiet");
            if (barcelona != null) ensureHiddenPoi(user, barcelona, "El Born Late Coffee Corner", "Cafe", 41.3857, 2.1810,
                    "A strong reset stop between Gothic lanes and the waterfront.",
                    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800", "coffee", "evening");
            if (tokyo != null) ensureHiddenPoi(user, tokyo, "Kagurazaka Lantern Walk", "Landmark", 35.7021, 139.7368,
                    "A quieter Tokyo layer with slopes, lantern light, and local rhythm.",
                    "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=800", "backstreet", "night");
            if (kyoto != null) ensureHiddenPoi(user, kyoto, "Temple Path Before the Crowds", "Viewpoint", 35.0248, 135.7783,
                    "A small early-start payoff where Kyoto feels hushed and cinematic.",
                    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800", "quiet", "morning");
            if (sanFrancisco != null) ensureHiddenPoi(user, sanFrancisco, "Hidden Stair Mosaic Route", "Street Art", 37.7598, -122.4364,
                    "A staircase detour that makes the city feel playful and personal.",
                    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800", "stairs", "street-art");
            if (prague != null) ensureHiddenPoi(user, prague, "Nusle Valley Viewpoint", "Viewpoint", 50.0659, 14.4296,
                    "A dramatic bridge-top view over the valley that most Prague visitors never find.",
                    "https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=800", "viewpoint", "quiet", "local");
            if (amsterdam != null) ensureHiddenPoi(user, amsterdam, "De Pijp Morning Bakery", "Cafe", 52.3545, 4.8977,
                    "A neighborhood bakery in De Pijp that locals treat as a ritual.",
                    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800", "coffee", "local", "morning");
        }
    }

    private void ensureGlobalPoi(City city, String name, String category, double latitude, double longitude,
                                 String description, String imageUrl, boolean featured, int visitMinutes,
                                 int priceLevel, String... tags) {
        PointOfInterest poi = poiRepository.findByCityIdAndIsGlobalTrueOrderByUsageCountDesc(city.getId()).stream()
                .filter(existing -> existing.getName() != null && existing.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(PointOfInterest::new);

        poi.setName(name);
        poi.setCategory(category);
        poi.setCity(city);
        poi.setLatitude(latitude);
        poi.setLongitude(longitude);
        poi.setDescription(description);
        poi.setMainImageUrl(imageUrl);
        poi.setImageUrl(imageUrl);
        poi.setIsGlobal(true);
        poi.setUsageCount(Optional.ofNullable(poi.getUsageCount()).orElse(0));
        poi.setRating(Optional.ofNullable(poi.getRating()).orElse(4.6));
        poi.setSource("seed");
        poi.setVerified(true);
        poi.setFeatured(featured);
        poi.setQualityScore(Math.max(Optional.ofNullable(poi.getQualityScore()).orElse(0), featured ? 92 : 84));
        poi.setEditorialScore(Math.max(Optional.ofNullable(poi.getEditorialScore()).orElse(0), featured ? 94 : 82));
        poi.setVisitMinutes(visitMinutes);
        poi.setPriceLevel(priceLevel);
        poi.setTags(buildTags(city, category, tags));
        poi.setGalleryUrls(new ArrayList<>(List.of(imageUrl)));
        poiRepository.save(poi);
    }

    private void ensureHiddenPoi(User user, City city, String name, String category, double latitude, double longitude,
                                 String description, String imageUrl, String... tags) {
        PointOfInterest poi = poiRepository.findByUserIdAndIsGlobalFalse(user.getId()).stream()
                .filter(existing -> existing.getCity() != null
                        && existing.getCity().getId() != null
                        && existing.getCity().getId().equals(city.getId())
                        && existing.getName() != null
                        && existing.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(PointOfInterest::new);

        poi.setName(name);
        poi.setCategory(category);
        poi.setCity(city);
        poi.setLatitude(latitude);
        poi.setLongitude(longitude);
        poi.setDescription(description);
        poi.setMainImageUrl(imageUrl);
        poi.setImageUrl(imageUrl);
        poi.setAddress(city.getName() + ", " + city.getCountry().getName());
        poi.setUser(user);
        poi.setIsGlobal(false);
        poi.setUsageCount(Optional.ofNullable(poi.getUsageCount()).orElse(0));
        poi.setRating(Optional.ofNullable(poi.getRating()).orElse(4.8));
        poi.setSource("user");
        poi.setVerified(false);
        poi.setFeatured(false);
        poi.setQualityScore(Math.max(Optional.ofNullable(poi.getQualityScore()).orElse(0), 88));
        poi.setEditorialScore(Math.max(Optional.ofNullable(poi.getEditorialScore()).orElse(0), 84));
        poi.setVisitMinutes(40);
        poi.setPriceLevel(1);
        poi.setTags(buildTags(city, category, tags));
        poi.setGalleryUrls(new ArrayList<>(List.of(imageUrl)));
        poiRepository.save(poi);
    }

    private List<String> buildTags(City city, String category, String... extraTags) {
        List<String> tags = new ArrayList<>();
        tags.add(city.getName().toLowerCase(Locale.ROOT));
        if (city.getCountry() != null && city.getCountry().getName() != null) {
            tags.add(city.getCountry().getName().toLowerCase(Locale.ROOT));
        }
        tags.add(category.toLowerCase(Locale.ROOT));
        tags.add("travel");
        for (String tag : extraTags) {
            if (tag != null && !tag.isBlank()) {
                tags.add(tag.toLowerCase(Locale.ROOT));
            }
        }
        return new ArrayList<>(tags.stream().distinct().toList());
    }

    private void refreshLocationCounters(List<Continent> continents, List<Country> countries, List<City> cities) {
        for (City city : cities) {
            int poiCount = poiRepository.findByCityIdAndIsGlobalTrueOrderByUsageCountDesc(city.getId()).size();
            city.setPoiCount(poiCount);
        }
        cityRepository.saveAll(cities);

        for (Country country : countries) {
            int citiesCount = (int) cities.stream()
                    .filter(city -> city.getCountry() != null && city.getCountry().getId().equals(country.getId()))
                    .count();
            int poiCount = cities.stream()
                    .filter(city -> city.getCountry() != null && city.getCountry().getId().equals(country.getId()))
                    .mapToInt(city -> city.getPoiCount() != null ? city.getPoiCount() : 0)
                    .sum();
            country.setCitiesCount(citiesCount);
            country.setPoiCount(poiCount);
        }
        countryRepository.saveAll(countries);

        for (Continent continent : continents) {
            int countriesCount = (int) countries.stream()
                    .filter(country -> country.getContinent() != null
                            && country.getContinent().getId().equals(continent.getId()))
                    .count();
            continent.setCountriesCount(countriesCount);
        }
        continentRepository.saveAll(continents);
    }

    private Continent findContinent(List<Continent> continents, String code) {
        return continents.stream().filter(c -> code.equals(c.getCode())).findFirst().orElse(null);
    }

    private Country findCountry(List<Country> countries, String code) {
        return countries.stream().filter(c -> code.equals(c.getCode())).findFirst().orElse(null);
    }

    private City findCity(List<City> cities, String name) {
        return cities.stream().filter(c -> name.equals(c.getName())).findFirst().orElse(null);
    }
}
