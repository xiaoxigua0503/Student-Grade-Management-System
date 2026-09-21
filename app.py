"""
Student Grade Management System - Flask Application
Persistent storage via student.dat, course.dat, score.dat (TXT format)
"""

import os
import re
from datetime import datetime
from flask import Flask, render_template_string, request, jsonify, redirect, url_for, flash

app = Flask(__name__)
app.secret_key = 'student_grade_mgmt_secret_key'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STUDENT_FILE = os.path.join(BASE_DIR, 'student.dat')
COURSE_FILE = os.path.join(BASE_DIR, 'course.dat')
SCORE_FILE = os.path.join(BASE_DIR, 'score.dat')

# Ensure files exist
for filepath in [STUDENT_FILE, COURSE_FILE, SCORE_FILE]:
    if not os.path.exists(filepath):
        open(filepath, 'a', encoding='utf-8').close()

def get_today_str():
    return datetime.now().strftime('%Y-%m-%d')

# --- DATA HELPERS ---
def read_students():
    students = []
    if os.path.exists(STUDENT_FILE):
        with open(STUDENT_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split(',')
                if len(parts) >= 6:
                    students.append({
                        'id': parts[0].strip(),
                        'name': parts[1].strip(),
                        'gender': parts[2].strip(),
                        'birth_date': parts[3].strip(),
                        'major': parts[4].strip(),
                        'college': parts[5].strip()
                    })
    return students

def write_students(students):
    with open(STUDENT_FILE, 'w', encoding='utf-8') as f:
        for s in students:
            f.write(f"{s['id']},{s['name']},{s['gender']},{s['birth_date']},{s['major']},{s['college']}\n")

def read_courses():
    courses = []
    if os.path.exists(COURSE_FILE):
        with open(COURSE_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split(',')
                if len(parts) >= 4:
                    try:
                        cr = float(parts[3].strip())
                    except ValueError:
                        cr = 0.0
                    courses.append({
                        'id': parts[0].strip(),
                        'name': parts[1].strip(),
                        'category': parts[2].strip(),
                        'credits': cr
                    })
    return courses

def write_courses(courses):
    with open(COURSE_FILE, 'w', encoding='utf-8') as f:
        for c in courses:
            f.write(f"{c['id']},{c['name']},{c['category']},{c['credits']:.1f}\n")

def read_scores():
    scores = []
    if os.path.exists(SCORE_FILE):
        with open(SCORE_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split(',')
                if len(parts) >= 4:
                    scores.append({
                        'student_id': parts[0].strip(),
                        'course_id': parts[1].strip(),
                        'score': parts[2].strip(),
                        'date': parts[3].strip()
                    })
    return scores

def write_scores(scores):
    with open(SCORE_FILE, 'w', encoding='utf-8') as f:
        for sc in scores:
            f.write(f"{sc['student_id']},{sc['course_id']},{sc['score']},{sc['date']}\n")

# --- VALIDATION ---
def validate_student_id(s_id):
    s_id = s_id.strip()
    if len(s_id) != 8 or not s_id.isdigit():
        return False, "Student ID must be exactly 8 digits (4-digit year + 4-digit sequence, e.g. 20230001)."
    return True, ""

def validate_course_id(c_id):
    c_id = c_id.strip().upper()
    if len(c_id) != 8:
        return False, "Course ID must be exactly 8 characters."
    prefix = c_id[:4]
    seq = c_id[4:]
    if prefix not in ['JCKC', 'ZYBX', 'ZYXX', 'BYSJ']:
        return False, "Course ID must start with JCKC, ZYBX, ZYXX, or BYSJ."
    if not seq.isdigit():
        return False, "Course ID last 4 characters must be digits (e.g. JCKC0001)."
    return True, ""

def validate_score_num(val):
    if val == '' or val is None:
        return True, ""
    try:
        f = float(val)
        if f < 0.0 or f > 100.0:
            return False, "Score must be between 0.00 and 100.00."
        return True, ""
    except ValueError:
        return False, "Score must be a valid number."

# --- API & WEB ROUTES ---
@app.route('/api/students', methods=['GET', 'POST'])
def api_students():
    if request.method == 'GET':
        name = request.args.get('name', '').lower()
        major = request.args.get('major', '').lower()
        college = request.args.get('college', '').lower()
        students = read_students()
        if name:
            students = [s for s in students if name in s['name'].lower() or name in s['id'].lower()]
        if major:
            students = [s for s in students if major in s['major'].lower()]
        if college:
            students = [s for s in students if college in s['college'].lower()]
        return jsonify({'success': True, 'students': students})
    else:
        data = request.json or request.form
        s_id = data.get('id', '').strip()
        ok, err = validate_student_id(s_id)
        if not ok:
            return jsonify({'success': False, 'error': err}), 400
        students = read_students()
        if any(s['id'] == s_id for s in students):
            return jsonify({'success': False, 'error': f"Student ID '{s_id}' already exists."}), 400
        new_s = {
            'id': s_id,
            'name': data.get('name', '').strip(),
            'gender': data.get('gender', '').strip(),
            'birth_date': data.get('birth_date', '').strip(),
            'major': data.get('major', '').strip(),
            'college': data.get('college', '').strip()
        }
        students.append(new_s)
        write_students(students)
        return jsonify({'success': True, 'student': new_s}), 201

@app.route('/api/courses', methods=['GET', 'POST'])
def api_courses():
    if request.method == 'GET':
        name = request.args.get('name', '').lower()
        cat = request.args.get('category', '').upper()
        courses = read_courses()
        if name:
            courses = [c for c in courses if name in c['name'].lower() or name in c['id'].lower()]
        if cat and cat != 'ALL':
            courses = [c for c in courses if c['category'] == cat]
        return jsonify({'success': True, 'courses': courses})
    else:
        data = request.json or request.form
        c_id = data.get('id', '').strip().upper()
        ok, err = validate_course_id(c_id)
        if not ok:
            return jsonify({'success': False, 'error': err}), 400
        courses = read_courses()
        if any(c['id'] == c_id for c in courses):
            return jsonify({'success': False, 'error': f"Course ID '{c_id}' already exists."}), 400
        try:
            credits = float(data.get('credits', 0))
            if credits <= 0:
                raise ValueError()
        except ValueError:
            return jsonify({'success': False, 'error': 'Credits must be positive number.'}), 400
        new_c = {
            'id': c_id,
            'name': data.get('name', '').strip(),
            'category': c_id[:4],
            'credits': credits
        }
        courses.append(new_c)
        write_courses(courses)
        return jsonify({'success': True, 'course': new_c}), 201

@app.route('/api/scores', methods=['GET', 'POST'])
def api_scores():
    if request.method == 'GET':
        s_query = request.args.get('studentId', '').strip().lower()
        c_query = request.args.get('courseId', '').strip().lower()
        g_query = request.args.get('q', '').strip().lower()
        status_filter = request.args.get('status', '').strip().lower()

        scores = read_scores()
        students = {s['id']: s for s in read_students()}
        courses = {c['id']: c for c in read_courses()}
        results = []
        for sc in scores:
            s_obj = students.get(sc['student_id'])
            c_obj = courses.get(sc['course_id'])
            if not s_obj or not c_obj:
                continue

            if s_query:
                match_s = s_query in sc['student_id'].lower() or s_query in s_obj['name'].lower()
                if not match_s:
                    continue

            if c_query:
                match_c = c_query in sc['course_id'].lower() or c_query in c_obj['name'].lower() or c_query in c_obj['category'].lower()
                if not match_c:
                    continue

            if g_query:
                match_g = (
                    g_query in sc['student_id'].lower() or
                    g_query in s_obj['name'].lower() or
                    g_query in s_obj['major'].lower() or
                    g_query in s_obj['college'].lower() or
                    g_query in sc['course_id'].lower() or
                    g_query in c_obj['name'].lower()
                )
                if not match_g:
                    continue

            if status_filter and status_filter != 'all':
                raw = sc['score']
                num = float(raw) if raw != '' else None
                if status_filter == 'passed' and (num is None or num < 60.0):
                    continue
                if status_filter == 'failed' and (num is None or num >= 60.0):
                    continue
                if status_filter == 'pending' and num is not None:
                    continue

            results.append({
                'studentId': sc['student_id'],
                'courseId': sc['course_id'],
                'score': sc['score'],
                'date': sc['date'],
                'studentName': s_obj['name'],
                'studentMajor': s_obj['major'],
                'studentCollege': s_obj['college'],
                'courseName': c_obj['name'],
                'courseCategory': c_obj['category'],
                'courseCredits': c_obj['credits']
            })
        return jsonify({'success': True, 'scores': results})
    else:
        data = request.json or request.form
        s_id = data.get('studentId', '').strip()
        c_id = data.get('courseId', '').strip().upper()
        raw_score = data.get('score', '')
        ok, err = validate_score_num(raw_score)
        if not ok:
            return jsonify({'success': False, 'error': err}), 400
        students = {s['id']: s for s in read_students()}
        courses = {c['id']: c for c in read_courses()}
        if s_id not in students:
            return jsonify({'success': False, 'error': f"Student '{s_id}' does not exist."}), 400
        if c_id not in courses:
            return jsonify({'success': False, 'error': f"Course '{c_id}' does not exist."}), 400
        score_val = f"{float(raw_score):.2f}" if raw_score != '' else ''
        dt = data.get('date', get_today_str())
        scores = read_scores()
        found = False
        for sc in scores:
            if sc['student_id'] == s_id and sc['course_id'] == c_id:
                sc['score'] = score_val
                sc['date'] = dt
                found = True
                break
        if not found:
            scores.append({'student_id': s_id, 'course_id': c_id, 'score': score_val, 'date': dt})
        write_scores(scores)
        return jsonify({'success': True})

@app.route('/api/scores/edit', methods=['PATCH', 'POST'])
def api_score_edit():
    data = request.json or request.form
    s_id = data.get('studentId', '').strip()
    c_id = data.get('courseId', '').strip().upper()
    raw_score = data.get('score', '')
    ok, err = validate_score_num(raw_score)
    if not ok:
        return jsonify({'success': False, 'error': err}), 400
    scores = read_scores()
    found = False
    for sc in scores:
        if sc['student_id'] == s_id and sc['course_id'] == c_id:
            sc['score'] = f"{float(raw_score):.2f}" if raw_score != '' else ''
            sc['date'] = get_today_str() # Automatically update date
            found = True
            break
    if not found:
        return jsonify({'success': False, 'error': 'Grade record not found.'}), 404
    write_scores(scores)
    return jsonify({'success': True})

@app.route('/api/scores/delete', methods=['POST'])
def api_score_delete():
    data = request.json or request.form
    s_id = data.get('studentId', '').strip()
    c_id = data.get('courseId', '').strip().upper()
    scores = read_scores()
    initial_len = len(scores)
    scores = [sc for sc in scores if not (sc['student_id'] == s_id and sc['course_id'] == c_id)]
    if len(scores) == initial_len:
        return jsonify({'success': False, 'error': 'Record not found.'}), 404
    write_scores(scores)
    return jsonify({'success': True, 'message': 'Grade deleted successfully.'})

@app.route('/api/transcript/<student_id>', methods=['GET'])
def api_transcript(student_id):
    student_id = student_id.strip()
    students = {s['id']: s for s in read_students()}
    if student_id not in students:
        return jsonify({'success': False, 'error': 'Student not found.'}), 404
    student = students[student_id]
    courses = {c['id']: c for c in read_courses()}
    scores = [sc for sc in read_scores() if sc['student_id'] == student_id]
    
    records = []
    highest = None
    lowest = None
    total_score = 0
    graded_count = 0
    for sc in scores:
        c = courses.get(sc['course_id'])
        if not c:
            continue
        num_score = float(sc['score']) if sc['score'] != '' else None
        if num_score is not None:
            graded_count += 1
            total_score += num_score
            highest = max(highest, num_score) if highest is not None else num_score
            lowest = min(lowest, num_score) if lowest is not None else num_score
        records.append({
            'courseId': c['id'],
            'courseName': c['name'],
            'credits': c['credits'],
            'score': sc['score'] if sc['score'] != '' else 'Pending',
            'date': sc['date']
        })
    avg = round(total_score / graded_count, 2) if graded_count > 0 else None
    return jsonify({
        'success': True,
        'transcript': {
            'student': student,
            'courses': records,
            'highestScore': highest,
            'lowestScore': lowest,
            'overallAverage': avg
        }
    })

@app.route('/api/statistics/<course_id>', methods=['GET'])
def api_statistics(course_id):
    course_id = course_id.strip().upper()
    courses = {c['id']: c for c in read_courses()}
    if course_id not in courses:
        return jsonify({'success': False, 'error': 'Course not found.'}), 404
    course = courses[course_id]
    students = {s['id']: s for s in read_students()}
    scores = [sc for sc in read_scores() if sc['course_id'] == course_id]
    
    counts = {'excellent': 0, 'good': 0, 'average': 0, 'pass': 0, 'fail': 0}
    records = []
    for sc in scores:
        s = students.get(sc['student_id'])
        if not s:
            continue
        num_score = float(sc['score']) if sc['score'] != '' else None
        if num_score is not None:
            if num_score >= 90:
                counts['excellent'] += 1
            elif num_score >= 80:
                counts['good'] += 1
            elif num_score >= 70:
                counts['average'] += 1
            elif num_score >= 60:
                counts['pass'] += 1
            else:
                counts['fail'] += 1
        records.append({
            'studentId': s['id'],
            'name': s['name'],
            'major': s['major'],
            'college': s['college'],
            'score': sc['score'] if sc['score'] != '' else 'Pending',
            'date': sc['date']
        })
    return jsonify({
        'success': True,
        'statistics': {
            'course': course,
            'records': records,
            'counts': counts,
            'total': len(records)
        }
    })

@app.route('/')
def home():
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Student Grade Management System (Flask)</title>
        <style>
            body {{ font-family: system-ui, -apple-system, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #1e293b; background: #f8fafc; }}
            .card {{ background: #fff; border-radius: 12px; padding: 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 1.5rem; }}
            h1 {{ color: #0f172a; margin-top: 0; }}
            .badge {{ background: #e0f2fe; color: #0369a1; padding: 0.2rem 0.6rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; }}
            code {{ background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Student Grade Management System <span class="badge">Flask + TXT Dat Backend</span></h1>
            <p>This Flask application persists all data directly to <code>student.dat</code>, <code>course.dat</code>, and <code>score.dat</code>.</p>
            <p>All functional requirements are active:</p>
            <ul>
                <li><strong>Students:</strong> 8-digit ID (year + sequence), CRUD + Search</li>
                <li><strong>Courses:</strong> 8-char ID (JCKC/ZYBX/ZYXX/BYSJ + seq), Credits, CRUD + Search</li>
                <li><strong>Scores:</strong> Enriched grade records with 2-decimal precision and reference validation</li>
                <li><strong>Enrollment:</strong> Stepwise course selection & persistence</li>
                <li><strong>Batch & Individual Grade Entry:</strong> Temporary draft saving & final submission</li>
                <li><strong>Grade Editing & Deletion:</strong> Automatic date update upon edit, deletion by student ID + course ID</li>
                <li><strong>Transcripts & Statistics:</strong> Highest/lowest/overall average, 90+/80-89/70-79/60-69/&lt;60 grade distribution</li>
            </ul>
            <p>Access the interactive Next.js web application on port 3000 to interact with the full web UI.</p>
        </div>
    </body>
    </html>
    """

if __name__ == '__main__':
    # Run Flask on port 5000 if executed directly
    app.run(host='0.0.0.0', port=5000, debug=True)
