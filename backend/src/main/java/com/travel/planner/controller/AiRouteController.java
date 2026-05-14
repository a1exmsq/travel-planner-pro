package com.travel.planner.controller;

import com.travel.planner.dto.ai.AiGenerateRouteRequestDTO;
import com.travel.planner.dto.ai.AiGenerateRouteResponseDTO;
import com.travel.planner.service.AiRouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiRouteController {

    private final AiRouteService aiRouteService;


    @PostMapping("/generate-route")
    public ResponseEntity<AiGenerateRouteResponseDTO> generateRoute(
            @RequestBody AiGenerateRouteRequestDTO request) {
        return ResponseEntity.ok(aiRouteService.generateRoute(request));
    }
}
