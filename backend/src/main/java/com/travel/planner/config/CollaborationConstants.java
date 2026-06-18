package com.travel.planner.config;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class CollaborationConstants {

    public static final int DEFAULT_INVITATION_PAGE_SIZE = 20;
    public static final int MAX_INVITATION_PAGE_SIZE = 100;
    public static final int DEFAULT_COLLABORATOR_PAGE_SIZE = 50;
    public static final int MAX_COLLABORATOR_PAGE_SIZE = 200;

    public static final int INVITATION_EXPIRATION_DAYS = 7;

    public static final int MIN_USER_SEARCH_QUERY_LENGTH = 2;
    public static final int DEFAULT_USER_SEARCH_LIMIT = 8;
}
