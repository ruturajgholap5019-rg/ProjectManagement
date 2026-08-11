// Centralized Enum definitions for SQLite database compatibility

export type UserRole = 'ADMIN' | 'PROJECT_LEAD' | 'TEAM_MEMBER';
export const UserRole = {
  ADMIN: 'ADMIN' as const,
  PROJECT_LEAD: 'PROJECT_LEAD' as const,
  TEAM_MEMBER: 'TEAM_MEMBER' as const,
};

export type MemberType = 'STUDENT' | 'EMPLOYEE';
export const MemberType = {
  STUDENT: 'STUDENT' as const,
  EMPLOYEE: 'EMPLOYEE' as const,
};

export type ProjectType =
  | 'WEBSITE_WEBAPP'
  | 'MOBILE_APP'
  | 'BMS'
  | 'UNIVERSITY_NEP'
  | 'DESIGN_SOCIAL_MEDIA'
  | 'PODCAST_MEDIA'
  | 'RESEARCH'
  | 'OTHER';
export const ProjectType = {
  WEBSITE_WEBAPP: 'WEBSITE_WEBAPP' as const,
  MOBILE_APP: 'MOBILE_APP' as const,
  BMS: 'BMS' as const,
  UNIVERSITY_NEP: 'UNIVERSITY_NEP' as const,
  DESIGN_SOCIAL_MEDIA: 'DESIGN_SOCIAL_MEDIA' as const,
  PODCAST_MEDIA: 'PODCAST_MEDIA' as const,
  RESEARCH: 'RESEARCH' as const,
  OTHER: 'OTHER' as const,
};

export type ProjectStatus =
  | 'PLANNING'
  | 'ONGOING'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'AT_RISK'
  | 'COMPLETED'
  | 'CANCELLED';
export const ProjectStatus = {
  PLANNING: 'PLANNING' as const,
  ONGOING: 'ONGOING' as const,
  ACTIVE: 'ACTIVE' as const,
  ON_HOLD: 'ON_HOLD' as const,
  AT_RISK: 'AT_RISK' as const,
  COMPLETED: 'COMPLETED' as const,
  CANCELLED: 'CANCELLED' as const,
};

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
export const TaskStatus = {
  TODO: 'TODO' as const,
  IN_PROGRESS: 'IN_PROGRESS' as const,
  REVIEW: 'REVIEW' as const,
  COMPLETED: 'COMPLETED' as const,
};

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export const Priority = {
  LOW: 'LOW' as const,
  MEDIUM: 'MEDIUM' as const,
  HIGH: 'HIGH' as const,
  CRITICAL: 'CRITICAL' as const,
};

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export const MilestoneStatus = {
  PENDING: 'PENDING' as const,
  IN_PROGRESS: 'IN_PROGRESS' as const,
  COMPLETED: 'COMPLETED' as const,
};
