'use client';

import React, { useState, useMemo } from 'react';
import { Course, CourseCategory } from '@/lib/types';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  BarChart3, 
  ClipboardEdit, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  BookMarked
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface CoursesTabProps {
  courses: Course[];
  onRefresh: () => void;
  onSelectForStats: (courseId: string) => void;
  onSelectForBatchGrades: (courseId: string) => void;
}

const ITEMS_PER_PAGE = 10;

export function CoursesTab({
  courses,
  onRefresh,
  onSelectForStats,
  onSelectForBatchGrades
}: CoursesTabProps) {
  const { t, language } = useLanguage();

  const CATEGORY_MAP: Record<CourseCategory, { label: string; descZh: string; descEn: string; color: string; badgeBg: string; text: string }> = {
    JCKC: { label: 'JCKC', descZh: '基础课程', descEn: 'Basic Courses', color: 'blue', badgeBg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    ZYBX: { label: 'ZYBX', descZh: '专业必修', descEn: 'Major Required', color: 'indigo', badgeBg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700' },
    ZYXX: { label: 'ZYXX', descZh: '专业选修', descEn: 'Major Elective', color: 'purple', badgeBg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
    BYSJ: { label: 'BYSJ', descZh: '毕业设计', descEn: 'Graduation Project', color: 'amber', badgeBg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  };

  // Search & Filter state
  const [searchName, setSearchName] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Form states
  const [formCategory, setFormCategory] = useState<CourseCategory>('JCKC');
  const [formSeq, setFormSeq] = useState('0015');
  const [formName, setFormName] = useState('');
  const [formCredits, setFormCredits] = useState('3.0');

  // Status feedback
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const q = searchName.trim().toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
      const matchesCat = filterCategory === 'ALL' || c.category === filterCategory;
      return matchesSearch && matchesCat;
    });
  }, [courses, searchName, filterCategory]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / ITEMS_PER_PAGE));
  const currentCourses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCourses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCourses, currentPage]);

  const handleOpenAdd = () => {
    const catCourses = courses.filter(c => c.category === 'JCKC');
    const nextSeq = String(catCourses.length + 1).padStart(4, '0');
    setFormCategory('JCKC');
    setFormSeq(nextSeq);
    setFormName('');
    setFormCredits('3.0');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleCategoryChange = (cat: CourseCategory) => {
    setFormCategory(cat);
    const catCourses = courses.filter(c => c.category === cat);
    const nextSeq = String(catCourses.length + 1).padStart(4, '0');
    setFormSeq(nextSeq);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setFormName(course.name);
    setFormCredits(course.credits.toString());
    setFormError('');
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const courseId = `${formCategory}${formSeq.padStart(4, '0')}`;
    const creditsNum = parseFloat(formCredits);
    if (isNaN(creditsNum) || creditsNum <= 0) {
      setFormError(language === 'zh' ? '学分必须为大于 0 的有效数值。' : 'Credits must be a positive number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: courseId,
          name: formName,
          credits: creditsNum
        })
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || (language === 'zh' ? '添加课程失败' : 'Failed to add course.'));
      } else {
        setIsAddModalOpen(false);
        showToast(language === 'zh' ? `课程 ${formName} (${courseId}) 已成功添加至 course.dat` : `Course ${formName} (${courseId}) added successfully.`);
        onRefresh();
      }
    } catch {
      setFormError(language === 'zh' ? '网络错误，无法添加课程' : 'Network error while adding course.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setFormError('');

    const creditsNum = parseFloat(formCredits);
    if (isNaN(creditsNum) || creditsNum <= 0) {
      setFormError(language === 'zh' ? '学分必须为大于 0 的有效数值。' : 'Credits must be a positive number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          credits: creditsNum
        })
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || (language === 'zh' ? '修改课程失败' : 'Failed to update course.'));
      } else {
        setEditingCourse(null);
        showToast(language === 'zh' ? `课程 ${formName} 信息已成功更新至 course.dat` : `Course ${formName} updated successfully.`);
        onRefresh();
      }
    } catch {
      setFormError(language === 'zh' ? '网络错误，无法更新课程' : 'Network error while updating course.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/courses/${courseToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!data.success) {
        showToast(data.error || (language === 'zh' ? '删除课程失败' : 'Failed to delete course.'), 'error');
      } else {
        showToast(language === 'zh' ? `课程 ${courseToDelete.name} (${courseToDelete.id}) 已成功删除` : `Course ${courseToDelete.name} (${courseToDelete.id}) deleted successfully.`);
        setCourseToDelete(null);
        onRefresh();
      }
    } catch {
      showToast(language === 'zh' ? '网络错误，删除课程失败' : 'Network error while deleting course.', 'error');
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

      {/* Category Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['JCKC', 'ZYBX', 'ZYXX', 'BYSJ'] as CourseCategory[]).map((cat) => {
          const catInfo = CATEGORY_MAP[cat];
          const count = courses.filter(c => c.category === cat).length;
          const isSelected = filterCategory === cat;
          const desc = language === 'zh' ? catInfo.descZh : catInfo.descEn;

          return (
            <button
              key={cat}
              onClick={() => {
                setFilterCategory(isSelected ? 'ALL' : cat);
                setCurrentPage(1);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected 
                  ? 'bg-indigo-50/70 border-indigo-500 shadow-xs ring-1 ring-indigo-500' 
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${catInfo.badgeBg} ${catInfo.text}`}>
                  {cat}
                </span>
                <span className="font-bold text-slate-800 text-base">{count}</span>
              </div>
              <p className="text-xs text-slate-600 font-medium truncate">{desc}</p>
            </button>
          );
        })}
      </div>

      {/* Controls Bar: Search by name, Category filter, Add button */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Search by Course Name or ID */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-course-name"
                type="text"
                value={searchName}
                onChange={(e) => {
                  setSearchName(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t.searchCoursePlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Filter by Category */}
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="filter-course-category"
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white appearance-none"
              >
                <option value="ALL">{t.all} {t.filterCategory} ({courses.length})</option>
                <option value="JCKC">JCKC - {t.catJCKC}</option>
                <option value="ZYBX">ZYBX - {t.catZYBX}</option>
                <option value="ZYXX">ZYXX - {t.catZYXX}</option>
                <option value="BYSJ">BYSJ - {t.catBYSJ}</option>
              </select>
            </div>
          </div>

          {/* Add Course Button */}
          <button
            id="btn-add-course"
            onClick={handleOpenAdd}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addCourse}</span>
          </button>
        </div>

        {/* Results summary */}
        <div className="text-xs text-slate-500 flex justify-between items-center">
          <span>
            {language === 'zh' ? '当前显示 ' : 'Showing '}
            <strong className="text-slate-700">{filteredCourses.length}</strong>
            {language === 'zh' ? ' 门课程（存储于 ' : ' course(s) in '}
            <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-600">course.dat</code>
            {language === 'zh' ? '）' : ''}
          </span>
          {(searchName || filterCategory !== 'ALL') && (
            <button
              onClick={() => {
                setSearchName('');
                setFilterCategory('ALL');
                setCurrentPage(1);
              }}
              className="text-indigo-600 hover:underline"
            >
              {t.reset}
            </button>
          )}
        </div>
      </div>

      {/* Courses Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-xs tracking-wider">
                <th className="py-3 px-4">{t.courseId}</th>
                <th className="py-3 px-4">{t.courseName}</th>
                <th className="py-3 px-4">{t.courseCategory}</th>
                <th className="py-3 px-4 text-center">{t.credits}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                currentCourses.map((course) => {
                  const catInfo = CATEGORY_MAP[course.category] || {
                    badgeBg: 'bg-slate-100 border-slate-200',
                    text: 'text-slate-700',
                    descZh: course.category,
                    descEn: course.category
                  };
                  const desc = language === 'zh' ? catInfo.descZh : catInfo.descEn;
                  return (
                    <tr key={course.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-700 whitespace-nowrap">
                        {course.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {course.name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${catInfo.badgeBg} ${catInfo.text}`}>
                          {course.category} • {desc}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {course.credits.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            id={`btn-course-batch-grade-${course.id}`}
                            onClick={() => onSelectForBatchGrades(course.id)}
                            title={t.batchGradeAction}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                          >
                            <ClipboardEdit className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-course-stats-${course.id}`}
                            onClick={() => onSelectForStats(course.id)}
                            title={t.viewStatsAction}
                            className="p-1.5 text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 rounded transition"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-edit-course-${course.id}`}
                            onClick={() => handleOpenEdit(course)}
                            title={t.edit}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-delete-course-${course.id}`}
                            onClick={() => setCourseToDelete(course)}
                            title={t.delete}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                id="btn-course-prev-page"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="btn-course-next-page"
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

      {/* MODAL: ADD COURSE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-lg">{t.addCourseTitle}</h3>
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

              {/* Category selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.courseCategory} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['JCKC', 'ZYBX', 'ZYXX', 'BYSJ'] as CourseCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`p-2 rounded-lg border text-left text-xs font-medium transition ${
                        formCategory === cat 
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-semibold' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-mono font-bold">{cat}</div>
                      <div className="text-[11px] text-slate-500">
                        {language === 'zh' ? CATEGORY_MAP[cat].descZh : CATEGORY_MAP[cat].descEn}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Course ID preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.courseId} <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <span className="font-mono px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-bold text-sm">
                    {formCategory}
                  </span>
                  <input
                    type="text"
                    maxLength={4}
                    value={formSeq}
                    onChange={(e) => setFormSeq(e.target.value.replace(/\D/g, ''))}
                    placeholder="0001"
                    required
                    className="flex-1 px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {t.courseIdHelp}
                </p>
              </div>

              {/* Course Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.courseName} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-add-course-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={language === 'zh' ? '如：高等数学 A' : 'e.g. Advanced Mathematics'}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Credits */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.credits} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-add-course-credits"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="15"
                  value={formCredits}
                  onChange={(e) => setFormCredits(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                  id="btn-submit-add-course"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? (language === 'zh' ? '正在保存至 .dat...' : 'Saving to .dat...') : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT COURSE */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{t.editCourseTitle}</h3>
                <p className="text-xs text-slate-500">{t.courseIdHelp}</p>
              </div>
              <button onClick={() => setEditingCourse(null)} className="text-slate-400 hover:text-slate-600">
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

              {/* Course ID (Locked) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.courseId} <span className="text-slate-400">({t.cannotEdit})</span>
                </label>
                <input
                  type="text"
                  value={editingCourse.id}
                  disabled
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-100 border border-slate-200 text-slate-500 rounded-lg cursor-not-allowed"
                />
              </div>

              {/* Course Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.courseName} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-edit-course-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Credits */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.credits} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-edit-course-credits"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="15"
                  value={formCredits}
                  onChange={(e) => setFormCredits(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-submit-edit-course"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? (language === 'zh' ? '正在保存...' : 'Updating...') : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE COURSE CONFIRMATION */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-lg">{t.deleteCourseTitle}</h3>
            </div>

            <p className="text-sm text-slate-600">
              {language === 'zh'
                ? `确定要删除课程 ${courseToDelete.name}（课程号: ${courseToDelete.id}）吗？删除后，所有与该课程关联的学生选课与成绩记录将从 score.dat 中同步清除。`
                : `Are you sure you want to permanently delete course ${courseToDelete.name} (${courseToDelete.id})? All enrolled students and scores for this course will be removed from score.dat.`}
            </p>

            <div className="flex justify-end space-x-2 pt-3">
              <button
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                {t.cancel}
              </button>
              <button
                id="btn-confirm-delete-course"
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
