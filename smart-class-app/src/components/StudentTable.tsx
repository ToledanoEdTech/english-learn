import React from 'react';
import { Student, GeneratedMessage } from '../types';

interface StudentTableProps {
  students: Student[];
  messages: Record<string, GeneratedMessage>;
  onToggleSelect: (id: string) => void;
  onUpdatePhone: (id: string, phone: string) => void;
  onViewStudent: (student: Student) => void;
  onSelectAll: (isSelected: boolean) => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  messages,
  onToggleSelect,
  onUpdatePhone,
  onViewStudent,
  onSelectAll,
}) => {
  const allSelected = students.length > 0 && students.every(s => s.isSelected);
  const indeterminate = students.some(s => s.isSelected) && !allSelected;

  const getStatusBadge = (studentId: string) => {
    const msg = messages[studentId];
    if (!msg) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">ממתין</span>;
    switch (msg.status) {
      case 'loading':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 animate-pulse">מעבד...</span>;
      case 'success':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">מוכן לשליחה</span>;
      case 'error':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">שגיאה</span>;
      default: return null;
    }
  };

  const handleWhatsAppClick = (phone: string | undefined, text: string) => {
    if (!phone) { alert("נא להזין מספר טלפון"); return; }
    const encodedText = encodeURIComponent(text);
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '972' + cleanPhone.substring(1);
    window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, '_blank');
  };

  const isOutlier = (val: any): boolean => {
    if (typeof val === 'number') return val < 55 || val > 95;
    if (typeof val === 'string' && !isNaN(Number(val))) {
      const num = Number(val);
      return num < 55 || num > 95;
    }
    return false;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
          <tr>
            <th scope="col" className="relative px-7 sm:w-12 sm:px-6 py-4">
              <input
                type="checkbox"
                className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                checked={allSelected}
                ref={input => { if (input) input.indeterminate = indeterminate; }}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </th>
            <th scope="col" className="px-3 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">שם התלמיד</th>
            <th scope="col" className="px-3 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">פרטים</th>
            <th scope="col" className="px-3 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">מידע מקוצר</th>
            <th scope="col" className="px-3 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">סטטוס</th>
            <th scope="col" className="px-3 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">פעולות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {students.map((student) => {
            const message = messages[student.id];
            const hasMessage = message?.status === 'success';
            return (
              <tr key={student.id} className={`group hover:bg-slate-50 transition-colors ${!student.isSelected ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                <td className="relative px-7 sm:w-12 sm:px-6">
                  <input
                    type="checkbox"
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    checked={student.isSelected}
                    onChange={() => onToggleSelect(student.id)}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-slate-800">
                  <div className="flex flex-col">
                     <span>{student.fullName}</span>
                     {student.language && (
                         <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full w-fit mt-1">
                            {student.language}
                         </span>
                     )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                  <input 
                    type="text" 
                    value={student.phoneNumber || ''} 
                    placeholder="הזן טלפון"
                    className="border-b border-dashed border-slate-300 hover:border-indigo-400 focus:border-indigo-600 focus:outline-none bg-transparent w-full max-w-[120px] pb-1 transition-colors dir-ltr text-right"
                    onChange={(e) => onUpdatePhone(student.id, e.target.value)}
                  />
                </td>
                <td className="px-3 py-4 text-sm text-slate-500">
                  <div className="flex flex-wrap gap-2 max-w-xs">
                    {student.subjects.slice(0, 3).map((sub, idx) => (
                      <div key={idx} className="flex flex-col bg-white p-1.5 rounded border border-slate-200 shadow-sm text-[10px] min-w-[70px]">
                        <span className="font-bold text-indigo-600 truncate">{sub.subjectName}</span>
                        {sub.grade && (
                             <span className={`${isOutlier(sub.grade) ? 'font-bold text-red-500' : 'text-slate-600'}`}>
                                {sub.grade}
                             </span>
                        )}
                      </div>
                    ))}
                    {student.subjects.length > 3 && (
                        <span className="text-xs text-slate-400 self-center">+{student.subjects.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                  {getStatusBadge(student.id)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                  <div className="flex items-center gap-3">
                    <button onClick={() => onViewStudent(student)} className="text-slate-500 hover:text-indigo-600 transition-colors p-1.5 flex items-center gap-1.5 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white hover:shadow-sm" title="כרטיס תלמיד מלא">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                         <span className="text-xs font-medium">כרטיס תלמיד</span>
                    </button>
                    {hasMessage && (
                        <>
                            <button onClick={() => handleWhatsAppClick(student.phoneNumber, message.text)} className="text-green-600 hover:text-green-700 transition-colors p-1.5 flex items-center gap-1.5 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg hover:shadow-sm" title="שלח בוואטסאפ">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592z"/></svg>
                                <span className="text-xs font-medium">שלח</span>
                            </button>
                            <details className="relative group">
                                <summary className="list-none cursor-pointer text-indigo-500 hover:text-indigo-700 p-1.5 flex items-center gap-1.5 border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
                                    <span className="text-xs font-medium">הצג</span>
                                </summary>
                                <div className="absolute left-0 top-full z-20 w-72 p-4 mt-2 origin-top-right bg-white rounded-xl shadow-xl ring-1 ring-slate-900/10 focus:outline-none text-right">
                                    <div className="absolute top-0 right-4 -mt-2 w-4 h-4 bg-white transform rotate-45 border-t border-l border-slate-100"></div>
                                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{message.text}</p>
                                </div>
                            </details>
                        </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {students.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-20 text-center text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 text-slate-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-lg font-medium text-slate-600">טרם הועלו נתונים</p>
                <p className="text-sm">אנא גרור קבצי אקסל או CSV לכאן כדי להתחיל</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};