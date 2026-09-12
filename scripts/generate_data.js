const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();

// --- 1. COURSES GENERATOR ---
const courses = [
  // JCKC - 基础课程 (Basic Courses)
  { id: 'JCKC0001', name: 'Advanced Mathematics I', category: 'JCKC', credits: 4.0 },
  { id: 'JCKC0002', name: 'Advanced Mathematics II', category: 'JCKC', credits: 4.0 },
  { id: 'JCKC0003', name: 'Linear Algebra', category: 'JCKC', credits: 3.0 },
  { id: 'JCKC0004', name: 'Probability & Mathematical Statistics', category: 'JCKC', credits: 3.0 },
  { id: 'JCKC0005', name: 'College Physics I', category: 'JCKC', credits: 3.5 },
  { id: 'JCKC0006', name: 'College Physics II', category: 'JCKC', credits: 3.5 },
  { id: 'JCKC0007', name: 'Introduction to Programming in C/C++', category: 'JCKC', credits: 3.5 },
  { id: 'JCKC0008', name: 'Discrete Mathematics', category: 'JCKC', credits: 3.0 },
  { id: 'JCKC0009', name: 'Academic English Communication', category: 'JCKC', credits: 2.0 },
  { id: 'JCKC0010', name: 'Engineering Ethics & Society', category: 'JCKC', credits: 2.0 },

  // ZYBX - 专业必修 (Major Required)
  { id: 'ZYBX0001', name: 'Data Structures & Algorithms', category: 'ZYBX', credits: 4.0 },
  { id: 'ZYBX0002', name: 'Computer Organization & Architecture', category: 'ZYBX', credits: 3.5 },
  { id: 'ZYBX0003', name: 'Operating Systems', category: 'ZYBX', credits: 3.5 },
  { id: 'ZYBX0004', name: 'Database System Principles', category: 'ZYBX', credits: 3.5 },
  { id: 'ZYBX0005', name: 'Computer Networks', category: 'ZYBX', credits: 3.5 },
  { id: 'ZYBX0006', name: 'Software Engineering Fundamentals', category: 'ZYBX', credits: 3.0 },
  { id: 'ZYBX0007', name: 'Digital Logic & Circuit Design', category: 'ZYBX', credits: 3.5 },
  { id: 'ZYBX0008', name: 'Signals & Linear Systems', category: 'ZYBX', credits: 3.5 },
  { id: 'ZYBX0009', name: 'Principles of Compilers', category: 'ZYBX', credits: 3.0 },
  { id: 'ZYBX0010', name: 'Algorithm Design & Analysis', category: 'ZYBX', credits: 3.0 },
  { id: 'ZYBX0011', name: 'Information Security Principles', category: 'ZYBX', credits: 3.0 },
  { id: 'ZYBX0012', name: 'Object-Oriented Programming & Design', category: 'ZYBX', credits: 3.0 },

  // ZYXX - 专业选修 (Major Elective)
  { id: 'ZYXX0001', name: 'Machine Learning Fundamentals', category: 'ZYXX', credits: 3.0 },
  { id: 'ZYXX0002', name: 'Deep Learning & Neural Networks', category: 'ZYXX', credits: 3.0 },
  { id: 'ZYXX0003', name: 'Computer Vision Applications', category: 'ZYXX', credits: 3.0 },
  { id: 'ZYXX0004', name: 'Natural Language Processing', category: 'ZYXX', credits: 3.0 },
  { id: 'ZYXX0005', name: 'Cloud Computing & Distributed Systems', category: 'ZYXX', credits: 2.5 },
  { id: 'ZYXX0006', name: 'Web Application Development', category: 'ZYXX', credits: 3.0 },
  { id: 'ZYXX0007', name: 'Mobile Application Architecture', category: 'ZYXX', credits: 2.5 },
  { id: 'ZYXX0008', name: 'Big Data Processing Technologies', category: 'ZYXX', credits: 3.0 },
  { id: 'ZYXX0009', name: 'Human-Computer Interaction', category: 'ZYXX', credits: 2.0 },
  { id: 'ZYXX0010', name: 'Embedded Systems & Internet of Things', category: 'ZYXX', credits: 3.0 },

  // BYSJ - 毕业设计 (Graduation Project)
  { id: 'BYSJ0001', name: 'Undergraduate Graduation Thesis & Project', category: 'BYSJ', credits: 8.0 },
  { id: 'BYSJ0002', name: 'Senior Comprehensive Capstone Design', category: 'BYSJ', credits: 6.0 },
  { id: 'BYSJ0003', name: 'Professional Internship & Practicum', category: 'BYSJ', credits: 4.0 }
];

// --- 2. STUDENTS GENERATOR ---
const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'Ethan', 'Isabella', 'Mason', 'Mia', 'William',
  'Ava', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Alexander', 'Evelyn', 'Henry',
  'Wei', 'Mei', 'Hao', 'Jing', 'Chen', 'Ying', 'Bo', 'Fang', 'Jun', 'Lin',
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Aditya', 'Diya', 'Kavya', 'Vikram', 'Neha', 'Sanjay',
  'Mateo', 'Sofia', 'Santiago', 'Valentina', 'Sebastian', 'Camila', 'Leonardo', 'Lucia', 'Alejandro', 'Elena',
  'Tariq', 'Fatima', 'Omar', 'Zahra', 'Hassan', 'Maryam', 'Yusuf', 'Amina', 'Ali', 'Layla'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor',
  'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
  'Patel', 'Sharma', 'Singh', 'Kumar', 'Gupta', 'Verma', 'Mehta', 'Joshi', 'Reddy', 'Rao',
  'Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Torres',
  'Al-Mansoor', 'Hakim', 'Farouk', 'Abbasi', 'Nasser', 'Siddiqui', 'Khan', 'Khoury', 'Rashid', 'Karimi'
];

const collegesAndMajors = [
  {
    college: 'College of Computer Science',
    majors: ['Computer Science', 'Software Engineering', 'Artificial Intelligence', 'Data Science', 'Cybersecurity']
  },
  {
    college: 'College of Information Science',
    majors: ['Information Systems', 'Electronic Information Engineering', 'Telecommunications', 'Network Engineering']
  },
  {
    college: 'College of Engineering',
    majors: ['Automation', 'Robotics Engineering', 'Mechanical Engineering', 'Electrical Engineering']
  },
  {
    college: 'College of Mathematics & Sciences',
    majors: ['Applied Mathematics', 'Information & Computing Science', 'Applied Physics', 'Statistics']
  },
  {
    college: 'College of Economics & Management',
    majors: ['Financial Technology', 'Management Information Systems', 'Business Analytics', 'E-Commerce']
  }
];

const students = [];
const years = [2021, 2022, 2023, 2024];

let studentSeq = 1;
// Generate 125 students (exceeds 100+)
for (let i = 0; i < 125; i++) {
  const year = years[i % years.length];
  const seqNum = String(studentSeq++).padStart(4, '0');
  const studentId = `${year}${seqNum}`;

  const fName = firstNames[i % firstNames.length];
  const lName = lastNames[(i * 3 + 7) % lastNames.length];
  const name = `${fName} ${lName}`;
  const gender = i % 2 === 0 ? 'Female' : 'Male';

  // Realistic birth dates matching college entry age (around 18-19 at admission)
  const birthYear = year - 18 - (i % 2);
  const birthMonth = String((i % 12) + 1).padStart(2, '0');
  const birthDay = String(((i * 7) % 28) + 1).padStart(2, '0');
  const birthDate = `${birthYear}-${birthMonth}-${birthDay}`;

  const collegeObj = collegesAndMajors[i % collegesAndMajors.length];
  const college = collegeObj.college;
  const major = collegeObj.majors[i % collegeObj.majors.length];

  students.push({
    id: studentId,
    name,
    gender,
    birthDate,
    major,
    college
  });
}

// --- 3. SCORES & ENROLLMENTS GENERATOR ---
// Generate 850+ score records
// Ensure realistic score distribution (Normal/Bell curve centered around 78-82)
// Some excellent (90+), good (80-89), average (70-79), pass (60-69), and fail (<60)
// Plus a few pending grades (empty string score) for recently enrolled courses.

function sampleRealisticScore(seed) {
  // Box-Muller transform pseudo-random with deterministic seed
  const u1 = Math.max(0.0001, (Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) / 2;
  const u2 = Math.max(0.0001, (Math.cos(seed * 78.233) * 43758.5453) % 1 + 1) / 2;
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  
  // Mean: 78.5, StdDev: 11.5
  let score = 78.5 + z0 * 11.5;
  if (score > 100) score = 97.5 + (score % 2.5);
  if (score < 42) score = 45.0 + (Math.abs(score) % 14);
  return Math.round(score * 100) / 100;
}

const scores = [];
let seedCounter = 1;

for (let sIdx = 0; sIdx < students.length; sIdx++) {
  const student = students[sIdx];
  const year = parseInt(student.id.substring(0, 4));
  
  // Older students (2021, 2022) have completed more courses (8 to 11 courses)
  // Younger students (2023, 2024) have fewer completed courses (5 to 8 courses)
  const count = year <= 2022 ? 8 + (sIdx % 4) : 5 + (sIdx % 4);
  
  // Choose courses: 3 JCKC, 3 ZYBX, 1-2 ZYXX, and BYSJ for senior (2021)
  const chosenCourseIds = new Set();

  // Basic courses (JCKC)
  for (let k = 0; k < 3; k++) {
    const c = courses.filter(c => c.category === 'JCKC')[(sIdx + k) % 10];
    chosenCourseIds.add(c.id);
  }

  // Major Required (ZYBX)
  for (let k = 0; k < 3; k++) {
    const c = courses.filter(c => c.category === 'ZYBX')[(sIdx * 2 + k) % 12];
    chosenCourseIds.add(c.id);
  }

  // Major Elective (ZYXX)
  for (let k = 0; k < (count - 6); k++) {
    const c = courses.filter(c => c.category === 'ZYXX')[(sIdx + k) % 10];
    chosenCourseIds.add(c.id);
  }

  // Senior capstone (BYSJ) for 2021 admission students
  if (year === 2021 && sIdx % 3 === 0) {
    chosenCourseIds.add('BYSJ0001');
  }

  let courseIndex = 0;
  for (const courseId of chosenCourseIds) {
    courseIndex++;
    seedCounter++;

    // Some recent courses are enrolled but not yet graded (about 3-4% of total)
    const isPendingGrade = (year === 2024 && courseIndex >= 5 && (seedCounter % 5 === 0));
    
    let scoreVal = '';
    let recordDate = '';

    if (isPendingGrade) {
      scoreVal = '';
      recordDate = '2024-09-05';
    } else {
      const numericScore = sampleRealisticScore(seedCounter + sIdx * 37);
      scoreVal = numericScore.toFixed(2);
      
      // Determine semester date
      const termYear = year + Math.floor((courseIndex - 1) / 3);
      const termMonth = (courseIndex % 2 === 0) ? '06' : '01';
      const termDay = String(10 + ((sIdx + courseIndex) % 18)).padStart(2, '0');
      recordDate = `${termYear}-${termMonth}-${termDay}`;
    }

    scores.push({
      studentId: student.id,
      courseId: courseId,
      score: scoreVal,
      date: recordDate
    });
  }
}

// Write student.dat
// Format: student_id,name,gender,birth_date,major,college
const studentLines = students.map(s => `${s.id},${s.name},${s.gender},${s.birthDate},${s.major},${s.college}`);
fs.writeFileSync(path.join(ROOT_DIR, 'student.dat'), studentLines.join('\n') + '\n', 'utf8');

// Write course.dat
// Format: course_id,course_name,category,credits
const courseLines = courses.map(c => `${c.id},${c.name},${c.category},${c.credits.toFixed(1)}`);
fs.writeFileSync(path.join(ROOT_DIR, 'course.dat'), courseLines.join('\n') + '\n', 'utf8');

// Write score.dat
// Format: student_id,course_id,score,date
const scoreLines = scores.map(sc => `${sc.studentId},${sc.courseId},${sc.score},${sc.date}`);
fs.writeFileSync(path.join(ROOT_DIR, 'score.dat'), scoreLines.join('\n') + '\n', 'utf8');

console.log(`Generated:`);
console.log(`- Students: ${students.length} (in student.dat)`);
console.log(`- Courses: ${courses.length} (in course.dat)`);
console.log(`- Scores/Enrollments: ${scores.length} (in score.dat)`);
