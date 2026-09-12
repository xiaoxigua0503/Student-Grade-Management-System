import fs from 'fs';
import path from 'path';
import {
  Student,
  Course,
  ScoreRecord,
  EnrichedScoreRecord,
  CourseCategory,
  StudentTranscript,
  TranscriptCourseItem,
  CourseStatistics,
  CourseStudentGradeItem
} from './types';

const ROOT_DIR = process.cwd();
const STUDENT_FILE = path.join(ROOT_DIR, 'student.dat');
const COURSE_FILE = path.join(ROOT_DIR, 'course.dat');
const SCORE_FILE = path.join(ROOT_DIR, 'score.dat');

// Ensure files exist on module load
function ensureFilesExist() {
  if (!fs.existsSync(STUDENT_FILE)) {
    fs.writeFileSync(STUDENT_FILE, '', 'utf8');
  }
  if (!fs.existsSync(COURSE_FILE)) {
    fs.writeFileSync(COURSE_FILE, '', 'utf8');
  }
  if (!fs.existsSync(SCORE_FILE)) {
    fs.writeFileSync(SCORE_FILE, '', 'utf8');
  }
}

// Format date helper: YYYY-MM-DD in local time
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format score to 2 decimals
export function formatScore(val: number | string): string {
  if (val === '' || val === null || val === undefined) return '';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '';
  return num.toFixed(2);
}

// Validation helpers
export function validateStudentId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Student ID is required.' };
  }
  const clean = id.trim();
  if (clean.length !== 8) {
    return { valid: false, error: 'Student ID must be exactly 8 characters (4-digit admission year + 4-digit sequence, e.g., 20230001).' };
  }
  if (!/^\d{8}$/.test(clean)) {
    return { valid: false, error: 'Student ID must consist of 8 digits (e.g., 20230001).' };
  }
  const year = parseInt(clean.substring(0, 4), 10);
  if (year < 1950 || year > 2099) {
    return { valid: false, error: 'Admission year portion must be between 1950 and 2099.' };
  }
  return { valid: true };
}

export function validateCourseId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Course ID is required.' };
  }
  const clean = id.trim().toUpperCase();
  if (clean.length !== 8) {
    return { valid: false, error: 'Course ID must be exactly 8 characters (4-char category code + 4-digit sequence, e.g., JCKC0001).' };
  }
  const prefix = clean.substring(0, 4);
  const validCategories: CourseCategory[] = ['JCKC', 'ZYBX', 'ZYXX', 'BYSJ'];
  if (!validCategories.includes(prefix as CourseCategory)) {
    return { valid: false, error: 'Course ID prefix must be one of: JCKC, ZYBX, ZYXX, BYSJ.' };
  }
  const seq = clean.substring(4);
  if (!/^\d{4}$/.test(seq)) {
    return { valid: false, error: 'Course ID sequence must be 4 digits (e.g., JCKC0001).' };
  }
  return { valid: true };
}

export function validateScoreValue(scoreStr: string | number): { valid: boolean; error?: string; num: number | null } {
  if (scoreStr === '' || scoreStr === null || scoreStr === undefined) {
    return { valid: true, num: null }; // Pending enrollment
  }
  const num = typeof scoreStr === 'number' ? scoreStr : parseFloat(String(scoreStr).trim());
  if (isNaN(num)) {
    return { valid: false, error: 'Score must be a valid numeric value.', num: null };
  }
  if (num < 0 || num > 100) {
    return { valid: false, error: 'Score must be between 0.00 and 100.00.', num: null };
  }
  return { valid: true, num };
}

// Low-level File IO
export function readStudentsRaw(): Student[] {
  ensureFilesExist();
  const content = fs.readFileSync(STUDENT_FILE, 'utf8');
  const lines = content.split('\n');
  const students: Student[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(',');
    if (parts.length >= 6) {
      students.push({
        id: parts[0].trim(),
        name: parts[1].trim(),
        gender: parts[2].trim(),
        birthDate: parts[3].trim(),
        major: parts[4].trim(),
        college: parts[5].trim()
      });
    }
  }
  return students;
}

export function writeStudentsRaw(students: Student[]): void {
  const lines = students.map(
    s => `${s.id.trim()},${s.name.trim()},${s.gender.trim()},${s.birthDate.trim()},${s.major.trim()},${s.college.trim()}`
  );
  fs.writeFileSync(STUDENT_FILE, lines.join('\n') + (lines.length > 0 ? '\n' : ''), 'utf8');
}

export function readCoursesRaw(): Course[] {
  ensureFilesExist();
  const content = fs.readFileSync(COURSE_FILE, 'utf8');
  const lines = content.split('\n');
  const courses: Course[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(',');
    if (parts.length >= 4) {
      courses.push({
        id: parts[0].trim(),
        name: parts[1].trim(),
        category: parts[2].trim() as CourseCategory,
        credits: parseFloat(parts[3].trim()) || 0
      });
    }
  }
  return courses;
}

export function writeCoursesRaw(courses: Course[]): void {
  const lines = courses.map(
    c => `${c.id.trim()},${c.name.trim()},${c.category.trim()},${Number(c.credits).toFixed(1)}`
  );
  fs.writeFileSync(COURSE_FILE, lines.join('\n') + (lines.length > 0 ? '\n' : ''), 'utf8');
}

export function readScoresRaw(): ScoreRecord[] {
  ensureFilesExist();
  const content = fs.readFileSync(SCORE_FILE, 'utf8');
  const lines = content.split('\n');
  const scores: ScoreRecord[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(',');
    if (parts.length >= 4) {
      scores.push({
        studentId: parts[0].trim(),
        courseId: parts[1].trim(),
        score: parts[2].trim(),
        date: parts[3].trim()
      });
    }
  }
  return scores;
}

export function writeScoresRaw(scores: ScoreRecord[]): void {
  const lines = scores.map(
    s => `${s.studentId.trim()},${s.courseId.trim()},${s.score.trim()},${s.date.trim()}`
  );
  fs.writeFileSync(SCORE_FILE, lines.join('\n') + (lines.length > 0 ? '\n' : ''), 'utf8');
}

// --- STUDENT OPERATIONS ---
export function getStudents(query?: { name?: string; major?: string; college?: string }): Student[] {
  let list = readStudentsRaw();
  if (!query) return list;

  if (query.name && query.name.trim()) {
    const qName = query.name.trim().toLowerCase();
    list = list.filter(s => s.name.toLowerCase().includes(qName) || s.id.toLowerCase().includes(qName));
  }
  if (query.major && query.major.trim()) {
    const qMajor = query.major.trim().toLowerCase();
    list = list.filter(s => s.major.toLowerCase().includes(qMajor));
  }
  if (query.college && query.college.trim()) {
    const qCollege = query.college.trim().toLowerCase();
    list = list.filter(s => s.college.toLowerCase().includes(qCollege));
  }
  return list;
}

export function getStudentById(id: string): Student | null {
  const list = readStudentsRaw();
  return list.find(s => s.id === id.trim()) || null;
}

export function createStudent(data: Omit<Student, 'id'> & { id: string }): { success: boolean; error?: string; student?: Student } {
  const idValidation = validateStudentId(data.id);
  if (!idValidation.valid) {
    return { success: false, error: idValidation.error };
  }

  if (!data.name || !data.name.trim()) {
    return { success: false, error: 'Student name cannot be empty.' };
  }
  if (!data.gender || !data.gender.trim()) {
    return { success: false, error: 'Gender is required.' };
  }
  if (!data.birthDate || !data.birthDate.trim()) {
    return { success: false, error: 'Birth date is required.' };
  }
  if (!data.major || !data.major.trim()) {
    return { success: false, error: 'Major is required.' };
  }
  if (!data.college || !data.college.trim()) {
    return { success: false, error: 'College is required.' };
  }

  const list = readStudentsRaw();
  const cleanId = data.id.trim();
  if (list.some(s => s.id === cleanId)) {
    return { success: false, error: `Student ID "${cleanId}" already exists.` };
  }

  const newStudent: Student = {
    id: cleanId,
    name: data.name.trim(),
    gender: data.gender.trim(),
    birthDate: data.birthDate.trim(),
    major: data.major.trim(),
    college: data.college.trim()
  };

  list.push(newStudent);
  writeStudentsRaw(list);
  return { success: true, student: newStudent };
}

export function updateStudent(id: string, updates: Partial<Omit<Student, 'id'>>): { success: boolean; error?: string; student?: Student } {
  const cleanId = id.trim();
  const list = readStudentsRaw();
  const index = list.findIndex(s => s.id === cleanId);
  if (index === -1) {
    return { success: false, error: `Student with ID "${cleanId}" not found.` };
  }

  const existing = list[index];
  const updated: Student = {
    id: existing.id, // ID cannot be edited per requirement
    name: updates.name !== undefined ? updates.name.trim() : existing.name,
    gender: updates.gender !== undefined ? updates.gender.trim() : existing.gender,
    birthDate: updates.birthDate !== undefined ? updates.birthDate.trim() : existing.birthDate,
    major: updates.major !== undefined ? updates.major.trim() : existing.major,
    college: updates.college !== undefined ? updates.college.trim() : existing.college
  };

  if (!updated.name) return { success: false, error: 'Name cannot be empty.' };
  if (!updated.gender) return { success: false, error: 'Gender cannot be empty.' };
  if (!updated.birthDate) return { success: false, error: 'Birth date cannot be empty.' };
  if (!updated.major) return { success: false, error: 'Major cannot be empty.' };
  if (!updated.college) return { success: false, error: 'College cannot be empty.' };

  list[index] = updated;
  writeStudentsRaw(list);
  return { success: true, student: updated };
}

export function deleteStudent(id: string): { success: boolean; error?: string } {
  const cleanId = id.trim();
  const list = readStudentsRaw();
  const index = list.findIndex(s => s.id === cleanId);
  if (index === -1) {
    return { success: false, error: `Student with ID "${cleanId}" not found.` };
  }

  list.splice(index, 1);
  writeStudentsRaw(list);

  // Clean up any scores or enrollments for this student to maintain reference integrity
  const scores = readScoresRaw().filter(sc => sc.studentId !== cleanId);
  writeScoresRaw(scores);

  return { success: true };
}

// --- COURSE OPERATIONS ---
export function getCourses(query?: { name?: string; category?: string }): Course[] {
  let list = readCoursesRaw();
  if (!query) return list;

  if (query.name && query.name.trim()) {
    const qName = query.name.trim().toLowerCase();
    list = list.filter(c => c.name.toLowerCase().includes(qName) || c.id.toLowerCase().includes(qName));
  }
  if (query.category && query.category.trim() && query.category !== 'ALL') {
    list = list.filter(c => c.category === query.category);
  }
  return list;
}

export function getCourseById(id: string): Course | null {
  const list = readCoursesRaw();
  return list.find(c => c.id === id.trim().toUpperCase()) || null;
}

export function createCourse(data: Omit<Course, 'id'> & { id: string }): { success: boolean; error?: string; course?: Course } {
  const cleanId = data.id.trim().toUpperCase();
  const idValidation = validateCourseId(cleanId);
  if (!idValidation.valid) {
    return { success: false, error: idValidation.error };
  }

  if (!data.name || !data.name.trim()) {
    return { success: false, error: 'Course name cannot be empty.' };
  }

  const category = cleanId.substring(0, 4) as CourseCategory;
  const credits = Number(data.credits);
  if (isNaN(credits) || credits <= 0 || credits > 20) {
    return { success: false, error: 'Credits must be a positive number between 0.5 and 20.0.' };
  }

  const list = readCoursesRaw();
  if (list.some(c => c.id === cleanId)) {
    return { success: false, error: `Course ID "${cleanId}" already exists.` };
  }

  const newCourse: Course = {
    id: cleanId,
    name: data.name.trim(),
    category,
    credits
  };

  list.push(newCourse);
  writeCoursesRaw(list);
  return { success: true, course: newCourse };
}

export function updateCourse(id: string, updates: Partial<Omit<Course, 'id'>>): { success: boolean; error?: string; course?: Course } {
  const cleanId = id.trim().toUpperCase();
  const list = readCoursesRaw();
  const index = list.findIndex(c => c.id === cleanId);
  if (index === -1) {
    return { success: false, error: `Course with ID "${cleanId}" not found.` };
  }

  const existing = list[index];
  const credits = updates.credits !== undefined ? Number(updates.credits) : existing.credits;
  if (isNaN(credits) || credits <= 0 || credits > 20) {
    return { success: false, error: 'Credits must be a positive number between 0.5 and 20.0.' };
  }

  const updated: Course = {
    id: existing.id, // ID cannot be edited per requirement
    name: updates.name !== undefined ? updates.name.trim() : existing.name,
    category: existing.category, // Category fixed to ID prefix
    credits
  };

  if (!updated.name) return { success: false, error: 'Course name cannot be empty.' };

  list[index] = updated;
  writeCoursesRaw(list);
  return { success: true, course: updated };
}

export function deleteCourse(id: string): { success: boolean; error?: string } {
  const cleanId = id.trim().toUpperCase();
  const list = readCoursesRaw();
  const index = list.findIndex(c => c.id === cleanId);
  if (index === -1) {
    return { success: false, error: `Course with ID "${cleanId}" not found.` };
  }

  list.splice(index, 1);
  writeCoursesRaw(list);

  // Clean up any scores or enrollments for this course
  const scores = readScoresRaw().filter(sc => sc.courseId !== cleanId);
  writeScoresRaw(scores);

  return { success: true };
}

// --- SCORE & ENROLLMENT OPERATIONS ---
export function getEnrichedScores(filters?: { studentId?: string; courseId?: string }): EnrichedScoreRecord[] {
  const scores = readScoresRaw();
  const students = readStudentsRaw();
  const courses = readCoursesRaw();

  const studentMap = new Map<string, Student>(students.map(s => [s.id, s]));
  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));

  let results: EnrichedScoreRecord[] = [];

  for (const sc of scores) {
    if (filters?.studentId && sc.studentId !== filters.studentId.trim()) continue;
    if (filters?.courseId && sc.courseId !== filters.courseId.trim().toUpperCase()) continue;

    const student = studentMap.get(sc.studentId);
    const course = courseMap.get(sc.courseId);

    // Filter out orphaned records if any
    if (!student || !course) continue;

    results.push({
      studentId: sc.studentId,
      courseId: sc.courseId,
      score: sc.score,
      date: sc.date,
      studentName: student.name,
      studentMajor: student.major,
      studentCollege: student.college,
      courseName: course.name,
      courseCategory: course.category,
      courseCredits: course.credits
    });
  }

  return results;
}

// Available courses for student enrollment
export function getAvailableCoursesForStudent(studentId: string): Course[] {
  const cleanId = studentId.trim();
  const courses = readCoursesRaw();
  const scores = readScoresRaw();
  const enrolledCourseIds = new Set(scores.filter(sc => sc.studentId === cleanId).map(sc => sc.courseId));

  return courses.filter(c => !enrolledCourseIds.has(c.id));
}

// Save student enrollment: select student -> select courses -> save enrollment
export function saveStudentEnrollment(studentId: string, courseIds: string[]): { success: boolean; error?: string; addedCount: number } {
  const cleanStudentId = studentId.trim();
  const student = getStudentById(cleanStudentId);
  if (!student) {
    return { success: false, error: `Student with ID "${cleanStudentId}" does not exist.`, addedCount: 0 };
  }

  const courses = readCoursesRaw();
  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));

  const scores = readScoresRaw();
  const existingSet = new Set(scores.map(s => `${s.studentId}_${s.courseId}`));
  const today = getTodayDateString();

  let addedCount = 0;
  for (const rawCourseId of courseIds) {
    const cleanCourseId = rawCourseId.trim().toUpperCase();
    if (!courseMap.has(cleanCourseId)) {
      return { success: false, error: `Course ID "${cleanCourseId}" does not exist.`, addedCount };
    }
    const key = `${cleanStudentId}_${cleanCourseId}`;
    if (!existingSet.has(key)) {
      scores.push({
        studentId: cleanStudentId,
        courseId: cleanCourseId,
        score: '', // Pending grade entry
        date: today
      });
      existingSet.add(key);
      addedCount++;
    }
  }

  writeScoresRaw(scores);
  return { success: true, addedCount };
}

// Individual grade entry or upsert
export function upsertGrade(
  studentId: string,
  courseId: string,
  scoreInput: string | number,
  dateInput?: string
): { success: boolean; error?: string; record?: ScoreRecord } {
  const cleanStudentId = studentId.trim();
  const cleanCourseId = courseId.trim().toUpperCase();

  // Validate reference existence
  const student = getStudentById(cleanStudentId);
  if (!student) {
    return { success: false, error: `Invalid student reference: Student ID "${cleanStudentId}" not found.` };
  }
  const course = getCourseById(cleanCourseId);
  if (!course) {
    return { success: false, error: `Invalid course reference: Course ID "${cleanCourseId}" not found.` };
  }

  // Validate score
  const scoreVal = validateScoreValue(scoreInput);
  if (!scoreVal.valid) {
    return { success: false, error: scoreVal.error };
  }

  const formattedScore = scoreVal.num !== null ? scoreVal.num.toFixed(2) : '';
  const date = dateInput && dateInput.trim() ? dateInput.trim() : getTodayDateString();

  const scores = readScoresRaw();
  const index = scores.findIndex(sc => sc.studentId === cleanStudentId && sc.courseId === cleanCourseId);

  const updatedRecord: ScoreRecord = {
    studentId: cleanStudentId,
    courseId: cleanCourseId,
    score: formattedScore,
    date
  };

  if (index !== -1) {
    scores[index] = updatedRecord;
  } else {
    scores.push(updatedRecord);
  }

  writeScoresRaw(scores);
  return { success: true, record: updatedRecord };
}

// Grade editing: only score can change; automatically update date to current date!
export function editGradeScoreOnly(
  studentId: string,
  courseId: string,
  newScoreInput: string | number
): { success: boolean; error?: string; record?: ScoreRecord } {
  const cleanStudentId = studentId.trim();
  const cleanCourseId = courseId.trim().toUpperCase();

  const scoreVal = validateScoreValue(newScoreInput);
  if (!scoreVal.valid) {
    return { success: false, error: scoreVal.error };
  }

  const scores = readScoresRaw();
  const index = scores.findIndex(sc => sc.studentId === cleanStudentId && sc.courseId === cleanCourseId);
  if (index === -1) {
    return { success: false, error: `Score record for Student "${cleanStudentId}" in Course "${cleanCourseId}" not found.` };
  }

  const newScoreFormatted = scoreVal.num !== null ? scoreVal.num.toFixed(2) : '';
  const currentDate = getTodayDateString(); // Automatically update date!

  scores[index] = {
    studentId: cleanStudentId,
    courseId: cleanCourseId,
    score: newScoreFormatted,
    date: currentDate
  };

  writeScoresRaw(scores);
  return { success: true, record: scores[index] };
}

// Grade deletion: delete one record at a time using student ID + course ID
export function deleteGradeRecord(studentId: string, courseId: string): { success: boolean; error?: string } {
  const cleanStudentId = studentId.trim();
  const cleanCourseId = courseId.trim().toUpperCase();

  const scores = readScoresRaw();
  const index = scores.findIndex(sc => sc.studentId === cleanStudentId && sc.courseId === cleanCourseId);
  if (index === -1) {
    return { success: false, error: `Grade record for Student "${cleanStudentId}" in Course "${cleanCourseId}" not found.` };
  }

  scores.splice(index, 1);
  writeScoresRaw(scores);
  return { success: true };
}

// Batch grade entry by course:
// Automatically course ID and enrolled-student list.
// Supports final submission to score.dat
export function batchSaveGradesByCourse(
  courseId: string,
  grades: Array<{ studentId: string; score: string | number }>
): { success: boolean; error?: string; updatedCount: number } {
  const cleanCourseId = courseId.trim().toUpperCase();
  const course = getCourseById(cleanCourseId);
  if (!course) {
    return { success: false, error: `Course "${cleanCourseId}" not found.`, updatedCount: 0 };
  }

  const scores = readScoresRaw();
  const scoreMap = new Map<string, number>();
  scores.forEach((sc, idx) => {
    if (sc.courseId === cleanCourseId) {
      scoreMap.set(sc.studentId, idx);
    }
  });

  const today = getTodayDateString();
  let updatedCount = 0;

  for (const item of grades) {
    const studentId = item.studentId.trim();
    if (!studentId) continue;

    const validation = validateScoreValue(item.score);
    if (!validation.valid) {
      return { success: false, error: `Invalid score for student ${studentId}: ${validation.error}`, updatedCount };
    }

    const formatted = validation.num !== null ? validation.num.toFixed(2) : '';

    if (scoreMap.has(studentId)) {
      const idx = scoreMap.get(studentId)!;
      scores[idx].score = formatted;
      scores[idx].date = today;
      updatedCount++;
    } else {
      // If student was not already in score.dat for this course, ensure student exists
      const student = getStudentById(studentId);
      if (student) {
        scores.push({
          studentId,
          courseId: cleanCourseId,
          score: formatted,
          date: today
        });
        updatedCount++;
      }
    }
  }

  writeScoresRaw(scores);
  return { success: true, updatedCount };
}

// --- STUDENT TRANSCRIPT ---
// Student transcript: course ID, course name, credits, score, date + highest score, lowest score, overall average.
export function getStudentTranscript(studentId: string): StudentTranscript | null {
  const cleanId = studentId.trim();
  const student = getStudentById(cleanId);
  if (!student) return null;

  const allCourses = readCoursesRaw();
  const courseMap = new Map<string, Course>(allCourses.map(c => [c.id, c]));
  const scores = readScoresRaw().filter(sc => sc.studentId === cleanId);

  const courseItems: TranscriptCourseItem[] = [];
  let highestScore: number | null = null;
  let lowestScore: number | null = null;
  let sumScore = 0;
  let gradedCount = 0;
  let weightedScoreSum = 0;
  let totalEnrolledCredits = 0;
  let earnedCredits = 0;

  for (const sc of scores) {
    const course = courseMap.get(sc.courseId);
    if (!course) continue;

    const numScore = sc.score !== '' ? parseFloat(sc.score) : null;
    const passed = numScore !== null && numScore >= 60.0;

    courseItems.push({
      courseId: course.id,
      courseName: course.name,
      category: course.category,
      credits: course.credits,
      score: sc.score !== '' ? sc.score : 'Pending',
      numericScore: numScore,
      date: sc.date,
      passed
    });

    totalEnrolledCredits += course.credits;
    if (passed) {
      earnedCredits += course.credits;
    }

    if (numScore !== null) {
      gradedCount++;
      sumScore += numScore;
      weightedScoreSum += numScore * course.credits;

      if (highestScore === null || numScore > highestScore) {
        highestScore = numScore;
      }
      if (lowestScore === null || numScore < lowestScore) {
        lowestScore = numScore;
      }
    }
  }

  const overallAverage = gradedCount > 0 ? Math.round((sumScore / gradedCount) * 100) / 100 : null;
  const weightedAverage = gradedCount > 0 && totalEnrolledCredits > 0
    ? Math.round((weightedScoreSum / totalEnrolledCredits) * 100) / 100
    : null;

  return {
    student,
    courses: courseItems,
    highestScore,
    lowestScore,
    overallAverage,
    weightedAverage,
    totalEnrolledCredits: Math.round(totalEnrolledCredits * 10) / 10,
    earnedCredits: Math.round(earnedCredits * 10) / 10,
    totalCoursesCount: courseItems.length,
    gradedCoursesCount: gradedCount
  };
}

// --- COURSE STATISTICS ---
// Course statistics: student ID, name, major, college, score, date + counts of 90+, 80–89, 70–79, 60–69, below 60.
export function getCourseStatistics(courseId: string): CourseStatistics | null {
  const cleanId = courseId.trim().toUpperCase();
  const course = getCourseById(cleanId);
  if (!course) return null;

  const students = readStudentsRaw();
  const studentMap = new Map<string, Student>(students.map(s => [s.id, s]));
  const scores = readScoresRaw().filter(sc => sc.courseId === cleanId);

  const records: CourseStudentGradeItem[] = [];
  const counts = {
    excellent: 0, // 90+
    good: 0,      // 80–89
    average: 0,   // 70–79
    pass: 0,      // 60–69
    fail: 0,      // below 60
    pending: 0
  };

  let sumScore = 0;
  let gradedCount = 0;
  let highestScore: number | null = null;
  let lowestScore: number | null = null;
  let passedCount = 0;

  for (const sc of scores) {
    const student = studentMap.get(sc.studentId);
    if (!student) continue;

    const numScore = sc.score !== '' ? parseFloat(sc.score) : null;

    records.push({
      studentId: student.id,
      name: student.name,
      gender: student.gender,
      major: student.major,
      college: student.college,
      score: sc.score !== '' ? sc.score : 'Pending',
      numericScore: numScore,
      date: sc.date
    });

    if (numScore === null) {
      counts.pending++;
    } else {
      gradedCount++;
      sumScore += numScore;

      if (numScore >= 90.0) {
        counts.excellent++;
      } else if (numScore >= 80.0) {
        counts.good++;
      } else if (numScore >= 70.0) {
        counts.average++;
      } else if (numScore >= 60.0) {
        counts.pass++;
      } else {
        counts.fail++;
      }

      if (numScore >= 60.0) {
        passedCount++;
      }

      if (highestScore === null || numScore > highestScore) {
        highestScore = numScore;
      }
      if (lowestScore === null || numScore < lowestScore) {
        lowestScore = numScore;
      }
    }
  }

  // Sort records: graded first descending by score, then pending
  records.sort((a, b) => {
    if (a.numericScore === null && b.numericScore === null) return a.studentId.localeCompare(b.studentId);
    if (a.numericScore === null) return 1;
    if (b.numericScore === null) return -1;
    return b.numericScore - a.numericScore;
  });

  const averageScore = gradedCount > 0 ? Math.round((sumScore / gradedCount) * 100) / 100 : null;
  const passingRate = gradedCount > 0 ? Math.round((passedCount / gradedCount) * 1000) / 10 : null;

  return {
    course,
    records,
    counts,
    totalEnrolled: records.length,
    totalGraded: gradedCount,
    averageScore,
    highestScore,
    lowestScore,
    passingRate
  };
}
