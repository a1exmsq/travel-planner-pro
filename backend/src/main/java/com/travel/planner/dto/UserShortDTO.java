package com.travel.planner.dto;

import com.travel.planner.entity.User;
import lombok.Data;

@Data
public class UserShortDTO {
    private Long id;
    private String username;
    private Integer level;
    private String levelTitle;

    public static UserShortDTO from(User user) {
        UserShortDTO dto = new UserShortDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getDisplayUsername());
        return dto;
    }
}
