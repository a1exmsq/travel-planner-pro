package com.travel.planner.service;

import com.travel.planner.dto.CommentResponseDTO;
import com.travel.planner.entity.Comment;
import com.travel.planner.entity.Route;
import com.travel.planner.entity.User;
import com.travel.planner.exception.ForbiddenException;
import com.travel.planner.exception.ResourceNotFoundException;
import com.travel.planner.repository.CommentRepository;
import com.travel.planner.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final RouteAccessService routeAccessService;
    private final UserRepository userRepository;
    private final GamificationService gamificationService;

    @Transactional
    public void addComment(Long routeId, Long userId, String text, User currentUser) {
        Route route = routeAccessService.findViewableRoute(routeId, currentUser);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Comment comment = new Comment();
        comment.setText(text);
        comment.setUser(user);
        comment.setRoute(route);
        commentRepository.save(comment);
        gamificationService.checkAndUnlockAchievements(user.getId());
    }

    public List<CommentResponseDTO> getComments(Long routeId, User currentUser) {
        routeAccessService.findViewableRoute(routeId, currentUser);
        return commentRepository.findByRoute_IdOrderByCreatedAtDesc(routeId)
                .stream()
                .map(CommentResponseDTO::from)
                .toList();
    }

    @Transactional
    public void deleteComment(Long commentId, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        boolean isAuthor = comment.getUser().getId().equals(currentUser.getId());
        boolean isRouteOwner = comment.getRoute().getUser().getId().equals(currentUser.getId());
        boolean isAdmin = "ADMIN".equals(currentUser.getRole());
        if (!isAuthor && !isRouteOwner && !isAdmin) {
            throw new ForbiddenException("No rights to delete this comment");
        }
        commentRepository.deleteById(commentId);
    }
}
