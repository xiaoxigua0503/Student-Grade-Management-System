export type CourseCategory = 'JCKC' | 'ZYBX' | 'ZYXX' | 'BYSJ';

export interface Student {
  id: string;          // 8 chars: admission year (4) + sequence (4), e.g. "20230001"
  name: string;
  gender: string;      // "Male" | "Female" | "Other"
  birthDate: string;   // YYYY-MM-DD
  major: string;
  college: string;
}

export interface Course {
  id: string;          // 8 chars: category code (4) + sequence (4), e.g. "JCKC0001"
  name: string;
  category: CourseCategory;
  credits: number;
}

export interface ScoreRecord {
  studentId: string;
  courseId: string;
  score: string;       // 2 decimals e.g. "88.50" or "" for pending grade
  date: string;        // YYYY-MM-DD
}

export interface EnrichedScoreRecord extends ScoreRecord {
  studentName: string;
  studentMajor: string;
  studentCollege: string;
  courseName: string;
  courseCategory: CourseCategory;
  courseCredits: number;
}

export interface TranscriptCourseItem {
  courseId: string;
  courseName: string;
  category: CourseCategory;
  credits: number;
  score: string;       // e.g. "88.50" or "Pending"
  numericScore: number | null;
  date: string;
  passed: boolean;
}

export interface StudentTranscript {
  student: Student;
  courses: TranscriptCourseItem[];
  highestScore: number | null;
  lowestScore: number | null;
  overallAverage: number | null;
  weightedAverage: number | null;
  totalEnrolledCredits: number;
  earnedCredits: number;
  totalCoursesCount: number;
  gradedCoursesCount: number;
}

export interface CourseStudentGradeItem {
  studentId: string;
  name: string;
  gender: string;
  major: string;
  college: string;
  score: string;
  numericScore: number | null;
  date: string;
}

export interface CourseStatistics {
  course: Course;
  records: CourseStudentGradeItem[];
  counts: {
    excellent: number; // 90+
    good: number;      // 80–89
    average: number;   // 70–79
    pass: number;      // 60–69
    fail: number;      // below 60
    pending: number;   // enrolled, not yet graded
  };
  totalEnrolled: number;
  totalGraded: number;
  averageScore: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  passingRate: number | null;
}
