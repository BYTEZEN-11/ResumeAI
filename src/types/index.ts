import type {
  User,
  Profile,
  Resume,
  JobDescription,
  ResumeAnalysis,
  ATSBreakdown,
  MatchedSkill,
  MissingSkill,
  Recommendation,
  InterviewQuestion,
  RewriteSuggestion,
  CareerRecommendation,
  Notification,
  Subscription,
  Payment,
  FeatureFlag,
  AuditLog,
  Team,
  TeamMember,
} from "@prisma/client";

export type {
  User,
  Profile,
  Resume,
  JobDescription,
  ResumeAnalysis,
  ATSBreakdown,
  MatchedSkill,
  MissingSkill,
  Recommendation,
  InterviewQuestion,
  RewriteSuggestion,
  CareerRecommendation,
  Notification,
  Subscription,
  Payment,
  FeatureFlag,
  AuditLog,
  Team,
  TeamMember,
};

export type UserWithProfile = User & {
  profile: Profile | null;
  subscription: Subscription | null;
};
export type AnalysisWithRelations = ResumeAnalysis & {
  resume: Resume;
  jobDescription: JobDescription;
  atsBreakdown: ATSBreakdown | null;
  matchedSkills: MatchedSkill[];
  missingSkills: MissingSkill[];
  recommendations: Recommendation[];
  interviewQuestions: InterviewQuestion[];
  rewriteSuggestions: RewriteSuggestion[];
  careerRecommendations: CareerRecommendation[];
};
export type ResumeWithFiles = Resume & {
  files: import("@prisma/client").ResumeFile[];
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: ValidationError[];
};
export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
export type ValidationError = {
  field: string;
  message: string;
};
export type PaginationParams = {
  page?: number;
  pageSize?: number;
  cursor?: string;
};
export type SortParams = {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};
export type FilterParams = {
  search?: string;
  startDate?: string;
  endDate?: string;
};
export type QueryParams = PaginationParams & SortParams & FilterParams;

export type DashboardStats = {
  totalResumes: number;
  totalAnalyses: number;
  averageAtsScore: number;
  averageSkillMatch: number;
  analysesThisMonth: number;
  improvementTrend: number;
};
export type ScoreTrend = {
  date: string;
  atsScore: number;
  skillMatch: number;
};
export type TopMissingSkill = {
  skill: string;
  count: number;
  category: string | null;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
};

export type UploadedFile = {
  url: string;
  path: string;
  name: string;
  size: number;
  type: "PDF" | "DOCX";
};

export type AnalysisInput = {
  resumeText: string;
  jobDescriptionText: string;
  jobTitle?: string;
  company?: string;
};

export type RawAnalysisResult = {
  atsScore: number;
  resumeScore: number;
  skillMatchPct: number;
  atsBreakdown: {
    keywordScore: number;
    formattingScore: number;
    sectionsScore: number;
    readabilityScore: number;
    experienceScore: number;
    overallScore: number;
    keywordDetails: Record<string, unknown>;
  };
  matchedSkills: Array<{
    skill: string;
    category: string;
    proficiency: string;
  }>;
  missingSkills: Array<{
    skill: string;
    category: string;
    importance: "critical" | "important" | "nice-to-have";
    reason: string;
  }>;
  recommendations: Array<{
    section: string;
    type: "improve" | "add" | "remove" | "rewrite";
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    example?: string;
  }>;
  interviewQuestions: Array<{
    question: string;
    category: "behavioral" | "technical" | "situational" | "culture";
    difficulty: "easy" | "medium" | "hard";
    hint?: string;
  }>;
  rewriteSuggestions: Array<{
    section: string;
    original: string;
    rewritten: string;
    explanation: string;
  }>;
  careerRecommendations: Array<{
    title: string;
    description: string;
    skillsToAdd: string[];
    timeline: string;
  }>;
};
