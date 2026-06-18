-- Add unique constraints to prevent race-condition duplicates

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_achievement
    ON user_achievements (user_id, achievement_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_route_collaborator
    ON route_collaborators (route_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_route_invitation_user_status
    ON route_invitations (route_id, invited_user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_route_like
    ON route_likes (user_id, route_id);
