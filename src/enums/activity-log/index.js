import _ from "lodash"

export const ACTIVITY_ACTIONS = {
  [ACTIVITY_RESOURCE_TYPE.LESSON]: {
    WATCHED: "watched",
    COMPLETED: "completed",
    SKIPPED: "skipped",
    PAUSED: "paused",
    RESUMED: "resumed",
    SKIPPED: "skipped",
    PAUSED: "paused",
    RESUMED: "resumed",
  },
  [ACTIVITY_RESOURCE_TYPE.QUIZ]: {
    COMPLETED: "completed",
    FAILED: "failed",
    SKIPPED: "skipped",
    PAUSED: "paused",
    RESUMED: "resumed",
    SKIPPED: "skipped",
    PAUSED: "paused",
    RESUMED: "resumed",
  },
  [ACTIVITY_RESOURCE_TYPE.COMMUNITY]: {
    POST_CREATED: "post_created",
    COMMENTED: "commented",
    LIKED: "liked",
    SHARED: "shared",
    REPORTED: "reported",
    MESSAGE_SENT: "sent",
    MESSAGE_READ: "message_read",
    MESSAGE_DELETED: "message_deleted",
    /** @todo - Might remove this later */
    MESSAGE_RECEIVED: "message_received",
  },
  [ACTIVITY_RESOURCE_TYPE.COURSE]: {
    ENROLLED: "enrolled",
    COMPLETED: "completed",
    SKIPPED: "skipped",
    PAUSED: "paused",
    RESUMED: "resumed",
    SKIPPED: "skipped",
    PAUSED: "paused",
    RESUMED: "resumed",
  },
  [ACTIVITY_RESOURCE_TYPE.MESSAGE]: {
  },
  [ACTIVITY_RESOURCE_TYPE.AUTH]: {
    LOGIN: "login",
    LOGOUT: "logout",
    REGISTER: "register",
    VERIFY_EMAIL: "verify_email",
    FORGOT_PASSWORD: "forgot_password",
    RESET_PASSWORD: "reset_password",
    CHANGE_PASSWORD: "change_password",
  },
  [ACTIVITY_RESOURCE_TYPE.PROFILE]: {
    PROFILE_UPDATED: "profile_updated",
  },
  [ACTIVITY_RESOURCE_TYPE.NOTIFICATION]: {
    NOTIFICATION_READ: "notification_read"
  },
}

export const ACTIVITY_RESOURCE_TYPE = {
  LESSON: "lesson",
  QUIZ: "quiz",
  COMMUNITY: "community",
  COURSE: "course",
  AUTH: "auth",
  PROFILE: "profile",
  NOTIFICATION: "notification",
}

export const FLAT_ACTIVITY_ACTIONS = _.flattenDeep(Object.values(ACTIVITY_ACTIONS));