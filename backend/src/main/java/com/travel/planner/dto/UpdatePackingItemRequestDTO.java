package com.travel.planner.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdatePackingItemRequestDTO {

    @Size(max = 160, message = "Checklist item title must be shorter than 160 characters")
    private String title;

    @Size(max = 64, message = "Category must be shorter than 64 characters")
    private String category;

    @Size(max = 255, message = "Notes must be shorter than 255 characters")
    private String notes;

    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 99, message = "Quantity must be smaller than 100")
    private Integer quantity;

    private Boolean packed;

    @Size(max = 64, message = "Required-for label must be shorter than 64 characters")
    private String requiredFor;

    private Integer orderIndex;
}
