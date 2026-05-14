package com.travel.planner.dto;

import com.travel.planner.entity.Comment;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class CommentResponseDTO {
    private Long id;
    private String text;
    private String authorUsername;
    private LocalDateTime createdAt;

    public static CommentResponseDTO from(Comment comment) {
        CommentResponseDTO dto = new CommentResponseDTO();
        dto.setId(comment.getId());
        dto.setText(comment.getText());
        dto.setCreatedAt(comment.getCreatedAt());
        if (comment.getUser() != null) {
            dto.setAuthorUsername(comment.getUser().getDisplayUsername());
        }
        return dto;
    }
}