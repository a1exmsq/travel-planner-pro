package com.travel.planner.service.provider;

import com.travel.planner.dto.WeatherDayDTO;
import com.travel.planner.dto.WeatherOverviewDTO;
import com.travel.planner.dto.WeatherStopSnapshotDTO;
import com.travel.planner.entity.City;
import com.travel.planner.entity.Route;
import com.travel.planner.entity.RoutePOI;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class StubWeatherProvider implements WeatherProvider {

    private static final List<String> CONDITIONS = List.of(
            "Sunny windows",
            "Light clouds",
            "Breezy and bright",
            "Showers possible",
            "Warm afternoon",
            "Cool evening"
    );

    @Override
    public String providerName() {
        return "travel-planner-weather";
    }

    @Override
    public WeatherOverviewDTO getForecast(Route route) {
        WeatherOverviewDTO overview = new WeatherOverviewDTO();
        overview.setProvider(providerName());
        overview.setGeneratedAt(LocalDateTime.now());

        int totalDays = route.getNumberOfDays() != null && route.getNumberOfDays() > 0
                ? Math.min(route.getNumberOfDays(), 7)
                : 5;
        LocalDate startDate = route.getStartDate() != null ? route.getStartDate() : LocalDate.now();
        int seed = Math.toIntExact(route.getId() != null ? route.getId() : 1L);

        for (int index = 0; index < totalDays; index++) {
            WeatherDayDTO day = new WeatherDayDTO();
            day.setDate(startDate.plusDays(index));
            day.setCondition(CONDITIONS.get(Math.floorMod(seed + index, CONDITIONS.size())));
            int low = 9 + Math.floorMod(seed + index * 3, 10);
            int high = low + 4 + Math.floorMod(seed + index, 7);
            day.setLowTempC(low);
            day.setHighTempC(high);
            day.setPrecipitationChance(10 + Math.floorMod(seed * 7 + index * 13, 65));
            day.setWindKph(8 + Math.floorMod(seed * 5 + index * 11, 24));
            day.setNote(index == 0 ? "Best day to lock transit and first-stop timing." : "Good to keep one flexible block in the day.");
            overview.getDays().add(day);
        }

        List<RoutePOI> stops = route.getRoutePois().stream()
                .sorted(java.util.Comparator.comparing(RoutePOI::getOrderIndex))
                .limit(4)
                .toList();

        for (int index = 0; index < stops.size(); index++) {
            RoutePOI stop = stops.get(index);
            WeatherStopSnapshotDTO snapshot = new WeatherStopSnapshotDTO();
            snapshot.setStopName(stop.getEffectiveName());
            snapshot.setCityName(stop.getPoi() != null && stop.getPoi().getCity() != null ? stop.getPoi().getCity().getName() : null);
            snapshot.setDate(startDate.plusDays(Math.min(index, Math.max(totalDays - 1, 0))));
            snapshot.setCondition(CONDITIONS.get(Math.floorMod(seed + index + 2, CONDITIONS.size())));
            snapshot.setTemperatureC(12 + Math.floorMod(seed * 3 + index * 5, 16));
            snapshot.setPrecipitationChance(12 + Math.floorMod(seed * 9 + index * 7, 58));
            overview.getStopSnapshots().add(snapshot);
        }

        overview.setSummary("Weather is generated from the route timeline so you can plan pacing, layers, and buffer time even before wiring a live provider.");
        return overview;
    }

    @Override
    public WeatherOverviewDTO getCityForecast(City city) {
        WeatherOverviewDTO overview = new WeatherOverviewDTO();
        overview.setProvider(providerName());
        overview.setGeneratedAt(LocalDateTime.now());

        int seed = Math.toIntExact(city.getId() != null ? city.getId() : 1L);
        LocalDate startDate = LocalDate.now();

        for (int index = 0; index < 5; index++) {
            WeatherDayDTO day = new WeatherDayDTO();
            day.setDate(startDate.plusDays(index));
            day.setCondition(CONDITIONS.get(Math.floorMod(seed + index + 1, CONDITIONS.size())));
            int low = 8 + Math.floorMod(seed + index * 2, 11);
            int high = low + 5 + Math.floorMod(seed + index, 6);
            day.setLowTempC(low);
            day.setHighTempC(high);
            day.setPrecipitationChance(12 + Math.floorMod(seed * 5 + index * 9, 58));
            day.setWindKph(7 + Math.floorMod(seed * 4 + index * 6, 22));
            day.setNote(index == 0
                    ? "Useful for deciding if the city wants a long walking block or more indoor stops."
                    : "Leave room for one flexible block in the plan.");
            overview.getDays().add(day);
        }

        overview.setSummary("City weather is prepared from the destination context so you can judge pacing, layers, and indoor versus outdoor balance before route-building.");
        return overview;
    }
}
