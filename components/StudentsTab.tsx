'use client';

import React, { useState, useMemo } from 'react';
import { Student } from '@/lib/types';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  FileText, 
  UserPlus, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface StudentsTabProps {
  students: Student[];
  onRefresh: () => void;
  onSelectForTranscript: (studentId: string) => void;
  onSelectForEnrollment: (studentId: string) => void;
}

const ITEMS_PER_PAGE = 10;

export function StudentsTab({
  students,
  onRefresh,
  onSelectForTranscript,
  onSelectForEnrollment
}: StudentsTabProps) {
  const { t, language } = useLanguage();

  // Search & Filter state
  const [searchName, setSearchName] = useState('');
  const [filterMajor, setFilterMajor] = useState('ALL');
  const [filterCollege, setFilterCollege] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Form states
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('女');
  const [formBirthDate, setFormBirthDate] = useState('2004-01-01');
  const [formMajor, setFormMajor] = useState('计算机科学与技术');
  const [formCollege, setFormCollege] = useState('计算机科学与工程学院');

  // Status feedback
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Derive unique majors and colleges for filters
  const allMajors = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => s.major && set.add(s.major));
    return Array.from(set).sort();
  }, [students]);

  const allColleges = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => s.college && set.add(s.college));
    return Array.from(set).sort();
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchName.trim().toLowerCase();
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
      const matchesMajor = filterMajor === 'ALL' || s.major === filterMajor;
      const matchesCollege = filterCollege === 'ALL' || s.college === filterCollege;
      return matchesSearch && matchesMajor && matchesCollege;
    });
  }, [students, searchName, filterMajor, filterCollege]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const currentStudents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  const handleOpenAdd = () => {
    // Generate suggested ID based on current year and sequence
    const year = '2024';
    const nextSeq = String(students.length + 1).padStart(4, '0');
    setFormId(`${year}${nextSeq}`);
    setFormName('');
    setFormGender(language === 'zh' ? '女' : 'Female');
    setFormBirthDate('2004-01-01');
    setFormMajor(allMajors[0] || (language === 'zh' ? '计算机科学与技术' : 'Computer Science'));
    setFormCollege(allColleges[0] || (language === 'zh' ? '计算机科学与工程学院' : 'College of Computer Science'));
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormId(student.id); // Locked per requirement
    setFormName(student.name);
    setFormGender(student.gender);
    setFormBirthDate(student.birthDate);
    setFormMajor(student.major);
    setFormCollege(student.college);
    setFormError('');
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Pre-validation of 8-character ID rule
    if (formId.trim().length !== 8) {
      setFormError(language === 'zh' ? '学号必须为精确 8 位字符（4位入学年份+4位序号，如 20210001）' : 'Student ID must be exactly 8 characters (4-digit admission year + 4-digit sequence, e.g. 20210001).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formId,
          name: formName,
          gender: formGender,
          birthDate: formBirthDate,
          major: formMajor,
          college: formCollege
        })
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || (language === 'zh' ? '添加学生失败' : 'Failed to add student.'));
      } else {
        setIsAddModalOpen(false);
        showToast(language === 'zh' ? `学生 ${formName} (${formId}) 已成功添加` : `Student ${formName} (${formId}) added successfully.`);
        onRefresh();
      }
    } catch {
      setFormError(language === 'zh' ? '网络错误，无法连接服务器' : 'Network error while adding student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setFormError('');

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          gender: formGender,
          birthDate: formBirthDate,
          major: formMajor,
          college: formCollege
        })
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || (language === 'zh' ? '更新学生信息失败' : 'Failed to update student.'));
      } else {
        setEditingStudent(null);
        showToast(language === 'zh' ? `学生 ${formName} 信息已成功更新` : `Student ${formName} details updated successfully.`);
        onRefresh();
      }
    } catch {
      setFormError(language === 'zh' ? '网络错误，无法更新学生信息' : 'Network error while updating student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/students/${studentToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!data.success) {
        showToast(data.error || (language === 'zh' ? '删除学生失败' : 'Failed to delete student.'), 'error');
      } else {
        showToast(language === 'zh' ? `学生 ${studentToDelete.name} (${studentToDelete.id}) 已成功删除` : `Student ${studentToDelete.name} (${studentToDelete.id}) deleted successfully.`);
        setStudentToDelete(null);
        onRefresh();
      }
    } catch {
      showToast(language === 'zh' ? '网络错误，删除失败' : 'Network error while deleting student.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl shadow-lg border flex items-center justify-between text-sm transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Bar: Search, Filters, Add Button */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search by Name or ID */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-student-name"
                type="text"
                value={searchName}
                onChange={(e) => {
                  setSearchName(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t.searchStudentPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Filter by Major */}
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="filter-student-major"
                value={filterMajor}
                onChange={(e) => {
                  setFilterMajor(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white appearance-none"
              >
                <option value="ALL">{t.all} {t.filterMajor} ({allMajors.length})</option>
                {allMajors.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Filter by College */}
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="filter-student-college"
                value={filterCollege}
                onChange={(e) => {
                  setFilterCollege(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white appearance-none"
              >
                <option value="ALL">{t.all} {t.filterCollege} ({allColleges.length})</option>
                {allColleges.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Student Button */}
          <button
            id="btn-add-student"
            onClick={handleOpenAdd}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addStudent}</span>
          </button>
        </div>

        {/* Results summary */}
        <div className="text-xs text-slate-500 flex justify-between items-center">
          <span>
            {language === 'zh' ? '当前显示 ' : 'Showing '}
            <strong className="text-slate-700">{filteredStudents.length}</strong>
            {language === 'zh' ? ' 名学生' : ' student(s)'}
          </span>
          {(searchName || filterMajor !== 'ALL' || filterCollege !== 'ALL') && (
            <button
              onClick={() => {
                setSearchName('');
                setFilterMajor('ALL');
                setFilterCollege('ALL');
                setCurrentPage(1);
              }}
              className="text-indigo-600 hover:underline"
            >
              {t.reset}
            </button>
          )}
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-xs tracking-wider">
                <th className="py-3 px-4">{t.studentId}</th>
                <th className="py-3 px-4">{t.studentName}</th>
                <th className="py-3 px-4">{t.gender}</th>
                <th className="py-3 px-4">{t.birthDate}</th>
                <th className="py-3 px-4">{t.major}</th>
                <th className="py-3 px-4">{t.college}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                currentStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3 px-4 font-mono font-medium text-indigo-700 whitespace-nowrap">
                      {student.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {student.name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                        student.gender === '女' || student.gender === 'Female' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {student.gender}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-xs">
                      {student.birthDate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                      {student.major}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-xs">
                      {student.college}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          id={`btn-enroll-${student.id}`}
                          onClick={() => onSelectForEnrollment(student.id)}
                          title={t.enrollCourse}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-transcript-${student.id}`}
                          onClick={() => onSelectForTranscript(student.id)}
                          title={t.viewTranscript}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-edit-${student.id}`}
                          onClick={() => handleOpenEdit(student)}
                          title={t.edit}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-${student.id}`}
                          onClick={() => setStudentToDelete(student)}
                          title={t.delete}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
            <div>
              {t.page} <strong className="text-slate-800">{currentPage}</strong> {t.of} <strong className="text-slate-800">{totalPages}</strong>
            </div>
            <div className="flex space-x-1">
              <button
                id="btn-prev-page"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="btn-next-page"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD STUDENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-lg">{t.addStudentTitle}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Student ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.studentId} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-add-student-id"
                  type="text"
                  maxLength={8}
                  value={formId}
                  onChange={(e) => setFormId(e.target.value.trim())}
                  placeholder="20240001"
                  required
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {t.studentIdHelp}
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.studentName} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-add-student-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={language === 'zh' ? '如：张伟' : 'e.g. Li Wei'}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Gender and Birth Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.gender} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="input-add-student-gender"
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={language === 'zh' ? '女' : 'Female'}>{t.female}</option>
                    <option value={language === 'zh' ? '男' : 'Male'}>{t.male}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.birthDate} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-add-student-birthdate"
                    type="date"
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Major and College */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.major} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-add-student-major"
                  type="text"
                  value={formMajor}
                  onChange={(e) => setFormMajor(e.target.value)}
                  placeholder={language === 'zh' ? '如：软件工程' : 'e.g. Software Engineering'}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.college} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-add-student-college"
                  type="text"
                  value={formCollege}
                  onChange={(e) => setFormCollege(e.target.value)}
                  placeholder={language === 'zh' ? '如：信息工程学院' : 'e.g. College of Information Engineering'}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-submit-add-student"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? (language === 'zh' ? '正在保存...' : 'Saving...') : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STUDENT */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{t.editStudentTitle}</h3>
                <p className="text-xs text-slate-500">{t.studentIdHelp}</p>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Student ID (Locked) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.studentId} <span className="text-slate-400">({t.cannotEdit})</span>
                </label>
                <input
                  type="text"
                  value={formId}
                  disabled
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-100 border border-slate-200 text-slate-500 rounded-lg cursor-not-allowed"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.studentName} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-edit-student-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Gender and Birth Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.gender} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="input-edit-student-gender"
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={language === 'zh' ? '女' : 'Female'}>{t.female}</option>
                    <option value={language === 'zh' ? '男' : 'Male'}>{t.male}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.birthDate} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-edit-student-birthdate"
                    type="date"
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Major and College */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.major} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-edit-student-major"
                  type="text"
                  value={formMajor}
                  onChange={(e) => setFormMajor(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.college} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-edit-student-college"
                  type="text"
                  value={formCollege}
                  onChange={(e) => setFormCollege(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-submit-edit-student"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? (language === 'zh' ? '正在更新...' : 'Updating...') : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE STUDENT CONFIRMATION */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-lg">{t.deleteStudentTitle}</h3>
            </div>

            <p className="text-sm text-slate-600">
              {language === 'zh'
                ? `确定要删除学生 ${studentToDelete.name}（学号: ${studentToDelete.id}）吗？删除后，该学生的所有选课与成绩记录都将同步清除。`
                : `Are you sure you want to permanently delete student ${studentToDelete.name} (${studentToDelete.id})? All enrolled courses and scores will be removed.`}
            </p>

            <div className="flex justify-end space-x-2 pt-3">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                {t.cancel}
              </button>
              <button
                id="btn-confirm-delete-student"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? (language === 'zh' ? '正在删除...' : 'Deleting...') : t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
