package com.travel.planner.mapper;

import com.travel.planner.dto.RouteResponseDTO;
import com.travel.planner.dto.RouteShortDTO;
import com.travel.planner.dto.UserShortDTO;
import com.travel.planner.entity.Route;
import com.travel.planner.entity.RouteType;
import com.travel.planner.entity.User;
import org.mapstruct.InheritConfiguration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RouteMapper {

    @Mapping(expression = "java(route.isPublic())", target = "public")
    @Mapping(expression = "java(routeTypeToString(route.getRouteType()))", target = "routeType")
    @Mapping(source = "primaryCountry.id", target = "primaryCountryId")
    @Mapping(source = "primaryCountry.name", target = "primaryCountryName")
    @Mapping(source = "primaryCountry.code", target = "primaryCountryCode")
    @Mapping(source = "primaryCountry.imageUrl", target = "primaryCountryImageUrl")
    @Mapping(source = "primaryCity.id", target = "primaryCityId")
    @Mapping(source = "primaryCity.name", target = "primaryCityName")
    @Mapping(source = "primaryCity.imageUrl", target = "primaryCityImageUrl")
    @Mapping(source = "user", target = "author")
    @Mapping(source = "forkedFromRoute.id", target = "forkedFromRouteId")
    @Mapping(source = "forkedFromRoute.name", target = "forkedFromRouteName")
    @Mapping(source = "forkedFromRoute.user.displayUsername", target = "forkedFromAuthorUsername")
    @Mapping(source = "originalRoute.id", target = "originalRouteId")
    @Mapping(source = "originalRoute.name", target = "originalRouteName")
    @Mapping(source = "originalRoute.user.displayUsername", target = "originalRouteAuthorUsername")
    RouteShortDTO toShortDto(Route route);

    @InheritConfiguration(name = "toShortDto")
    RouteResponseDTO toResponseDto(Route route);

    @Mapping(source = "id", target = "id")
    @Mapping(source = "displayUsername", target = "username")
    UserShortDTO toUserShortDto(User user);

    default String routeTypeToString(RouteType routeType) {
        return routeType != null ? routeType.name() : RouteType.CUSTOM.name();
    }
}
