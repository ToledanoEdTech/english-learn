const fs = require('fs');
const path = require('path');

// 1. הגדרת מבנה הקבצים והתוכן שלהם
const files = {
  'package.json': JSON.stringify({
    "name": "smart-class-app",
    "private": true,
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "@google/genai": "^1.34.0",
      "xlsx": "^0.18.5"
    },
    "devDependencies": {
      "@types/react": "^18.2.66",
      "@types/react-dom": "^18.2.22",
      "@vitejs/plugin-react": "^4.2.1",
      "typescript": "^5.2.2",
      "vite": "^5.2.0"
    }
  }, null, 2),

  'tsconfig.json': JSON.stringify({
    "compilerOptions": {
      "target": "ES2020",
      "useDefineForClassFields": true,
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,
      "jsx": "react-jsx",
      "strict": true,
      "noUnusedLocals": false,
      "noUnusedParameters": false,
      "noFallthroughCasesInSwitch": true
    },
    "include": ["src"],
    "references": [{ "path": "./tsconfig.node.json" }]
  }, null, 2),

  'tsconfig.node.json': JSON.stringify({
    "compilerOptions": {
      "composite": true,
      "skipLibCheck": true,
      "module": "ESNext",
      "moduleResolution": "bundler",
      "allowSyntheticDefaultImports": true
    },
    "include": ["vite.config.ts"]
  }, null, 2),

  'vite.config.ts': `import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})`,

  'index.html': `<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>קשר חכם - Toledano EdTech</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style> body { font-family: 'Rubik', sans-serif; } </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,

  '.env': `API_KEY=YOUR_API_KEY_HERE`,

  'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,

  'src/types.ts': `
export interface SubjectRecord {
  subjectName: string;
  grade?: string | number;
  comments?: string;
  behavior?: string;
  absences?: string | number;
  lates?: string | number;
  [key: string]: any;
}

export interface Student {
  id: string;
  fullName: string;
  firstName: string;
  phoneNumber?: string;
  language?: string;
  subjects: SubjectRecord[];
  isSelected: boolean;
}

export interface GeneratedMessage {
  studentId: string;
  text: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  timestamp: number;
}

export enum GenerationStyle {
  DETAILED = 'detailed',
  GENERAL = 'general',
  REPORT_CARD = 'report_card',
}

export interface AppState {
  students: Student[];
  messages: Record<string, GeneratedMessage>;
  isProcessing: boolean;
  files: string[];
}`,

  'src/services/dataProcessor.ts': `import { Student, SubjectRecord } from '../types';
import * as XLSX from 'xlsx';

const NAME_HEADERS = [
  'name', 'student', 'student name', 'full name', 'firstname', 'lastname',
  'שם', 'שם תלמיד', 'שם מלא', 'התלמיד', 'שם ושם משפחה',
  'שם התלמיד/ה', 'פרטי תלמיד', 'שמות', 'שם פרטי', 'שם משפחה'
];

const PHONE_HEADERS = [
  'phone', 'cell', 'mobile', 'parent phone', 'contact',
  'טלפון', 'נייד', 'מספר טלפון', 'פלאפון', 'טלפון נייד', 'טלפון הורים', 'סלולרי', 'נייד הורים', 'נייד אב', 'נייד אם'
];

const INVALID_ROW_KEYWORDS = [
  'ממוצע', 'סה"כ', 'סיכום', 'total', 'average', 'count', 'min', 'max', 'std', 'grand total',
  'מורה', 'צוות', 'הנהלה', 'teacher', 'staff', 'מחנך', 'מחנכת', 'סייעת', 'רכזת', 'מנהלת', 'מנהל', 'מלמד',
  'תפילה', 'תפילת', 'מנחה', 'שחרית', 'תפילת מנחה', 'תפילת שחרית',
  'פרטני', 'שעות פרטני', 'תיגבור', 'תגבור', 'קבוצה',
  'חינוך', 'שעת חינוך', 'שיעור חינוך',
  'גמרא', 'משנה', 'נביא', 'תורה', 'חומש', 'דינים', 'הלכה', 'יהדות', 'מחשבת ישראל', 'פרשת שבוע', 'ביאור תפילה', 'תושב"ע',
  'מתמטיקה', 'חשבון', 'הנדסה', 'גיאומטריה', 'אנגלית', 'english', 'מדעים', 'פיזיקה', 'כימיה', 'ביולוגיה', 
  'היסטוריה', 'אזרחות', 'גיאוגרפיה', 'מולדת', 'ספרות', 'לשון', 'עברית', 'הבעה', 'שפה', 'כתיבה', 'קריאה',
  'ספורט', 'חינוך גופני', 'חנ"ג', 'אומנות', 'מוזיקה', 'מחשבים', 'טכנולוגיה', 'סייבר', 'תקשוב',
  'מקצוע', 'subject', 'כיתה', 'class', 'שכבה', 'grade'
];

const cleanStr = (str: any): string => String(str || '').trim().toLowerCase();

const findHeaderRowIndex = (data: any[][]): number => {
  let bestRowIndex = 0;
  let maxScore = -1;
  for (let i = 0; i < Math.min(data.length, 50); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    let score = 0;
    if (row.some(cell => NAME_HEADERS.includes(cleanStr(cell)))) score += 10;
    if (row.some(cell => PHONE_HEADERS.includes(cleanStr(cell)))) score += 5;
    const textCells = row.filter(c => c && typeof c === 'string' && c.trim().length > 1).length;
    score += textCells;
    if (score > maxScore) {
      maxScore = score;
      bestRowIndex = i;
    }
  }
  return maxScore > 0 ? bestRowIndex : 0;
};

const detectNameColumnIndex = (data: any[][], headerRowIdx: number, headers: string[]): number => {
  if (data.length <= headerRowIdx + 1) return -1;
  const numCols = data[headerRowIdx]?.length || 0;
  let bestCol = -1;
  let maxScore = -1;
  for (let col = 0; col < numCols; col++) {
    const headerName = cleanStr(headers[col]);
    if (headerName.includes('מורה') || headerName.includes('teacher') || headerName.includes('מחנך') || headerName.includes('מלמד')) continue;
    let score = 0;
    let checkedRows = 0;
    for (let row = headerRowIdx + 1; row < Math.min(data.length, headerRowIdx + 20); row++) {
       const val = data[row]?.[col];
       if (!val) continue;
       const strVal = String(val).trim();
       if (strVal.length < 2) continue;
       checkedRows++;
       if (/^[\\d.,%-]+$/.test(strVal)) { score -= 10; } 
       else if (/[\\u0590-\\u05FFa-zA-Z ]+/.test(strVal)) {
          if (strVal.includes('מורה') || strVal.includes('Teacher')) { score -= 20; } else { score += 2; }
       }
    }
    if (checkedRows > 0 && score > maxScore) {
      maxScore = score;
      bestCol = col;
    }
  }
  return maxScore > 0 ? bestCol : -1;
};

const extractSubjectFromFileName = (fileName: string): string => {
  return fileName.replace(/\\.[^/.]+$/, "").replace(/[_-]/g, " ");
};

export const processFiles = async (files: File[]): Promise<Student[]> => {
  const studentMap = new Map<string, Student>();
  for (const file of files) {
    try {
      const fileNameSubject = extractSubjectFromFileName(file.name);
      const rawData = await parseFileToRawArrays(file);
      if (!rawData || rawData.length === 0) continue;
      const headerRowIndex = findHeaderRowIndex(rawData);
      const headerRow = rawData[headerRowIndex] || [];
      const dataRows = rawData.slice(headerRowIndex + 1);
      let headers = headerRow.map((h, i) => {
        const val = String(h || '').trim();
        return val || \`עמודה \${i + 1}\`;
      });
      let nameIdx = -1;
      for (let i = 0; i < headers.length; i++) {
          const h = cleanStr(headers[i]);
          if (h.includes('מורה') || h.includes('teacher') || h.includes('מחנך')) continue;
          if (NAME_HEADERS.includes(h)) { nameIdx = i; break; }
      }
      if (nameIdx === -1) { nameIdx = detectNameColumnIndex(rawData, headerRowIndex, headers); }
      if (nameIdx === -1) { console.warn(\`Could not identify name column in file: \${file.name}\`); continue; }
      const phoneIdx = headers.findIndex(h => PHONE_HEADERS.some(ph => cleanStr(h).includes(ph)));
      dataRows.forEach((row) => {
        const rawName = row[nameIdx];
        if (!rawName) return;
        const fullName = String(rawName).trim();
        const lowerName = fullName.toLowerCase();
        if (fullName.length < 2) return;
        if (INVALID_ROW_KEYWORDS.some(k => lowerName.includes(k))) return;
        if (NAME_HEADERS.includes(lowerName)) return; 
        if (/^\\d+$/.test(fullName.replace(/[- ]/g, ''))) return; 
        if (lowerName.startsWith('המורה') || lowerName.startsWith('teacher')) return;
        let student = studentMap.get(fullName);
        if (!student) {
          student = {
            id: crypto.randomUUID(),
            fullName: fullName,
            firstName: fullName.split(' ').pop() || fullName,
            subjects: [],
            isSelected: true
          };
          studentMap.set(fullName, student);
        }
        if (!student.phoneNumber && phoneIdx !== -1 && row[phoneIdx]) {
           student.phoneNumber = String(row[phoneIdx]).replace(/[^0-9+]/g, '');
        }
        const record: SubjectRecord = { subjectName: fileNameSubject };
        row.forEach((cell, idx) => {
           if (idx === nameIdx || idx === phoneIdx) return; 
           if (cell === undefined || cell === null || cell === '') return;
           let headerName = headers[idx];
           const cleanHeader = cleanStr(headerName);
           if (cleanHeader.includes('מורה') || cleanHeader.includes('מחנך')) return;
           record[headerName] = cell;
        });
        student.subjects.push(record);
      });
    } catch (error) { console.error(\`Error processing \${file.name}\`, error); }
  }
  return Array.from(studentMap.values());
};

const parseFileToRawArrays = (file: File): Promise<any[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        resolve(jsonData);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};`,

  'src/services/geminiService.ts': `import { GoogleGenAI } from "@google/genai";
import { Student, GenerationStyle } from "../types";

const getClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

export const generateStudentMessage = async (
  student: Student,
  style: GenerationStyle,
  customInstructions: string,
  teacherName: string,
  abortSignal?: AbortSignal
): Promise<string> => {
  const ai = getClient();
  const prompt = createPrompt(student, style, customInstructions, teacherName);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        systemInstruction: \`You are a professional school teacher writing a personalized update.
        Guidelines:
        1. Be honest and direct based on the data.
        2. Sign the message exactly as: "\${teacherName}".
        3. Language: Write in \${student.language || 'Hebrew'}.
        \`
      }
    });
    if (abortSignal?.aborted) { throw new Error("Aborted"); }
    return response.text?.trim() || "שגיאה ביצירת ההודעה.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "שגיאה בהתחברות ל-AI. אנא בדוק את מפתח ה-API או נסה שנית.";
  }
};

const createPrompt = (student: Student, style: GenerationStyle, customInstructions: string, teacherName: string): string => {
  let dataDescription = JSON.stringify(student.subjects, null, 2);
  let styleInstructions = "";
  let openingInstruction = "";
  const targetLanguage = student.language || 'Hebrew';

  if (style === GenerationStyle.REPORT_CARD) {
     openingInstruction = \`Start the message exactly with: "\${student.firstName} היקר," (or correct gender equivalent in Hebrew).\`;
     styleInstructions = \`
     Write a personal, warm, and strengthening letter for the report card (approx. 300-500 characters).
     KEY FOCUS INSTRUCTIONS:
     1. Focus PRIMARILY on **Behavior, Derech Eretz (Respect), and Good Character Traits (Middot Tovot)**.
     2. Academic achievements are secondary to character and values in this message.
     3. Highlight positive points, kindness, social behavior, and effort.
     4. Be optimistic, empowering, and warm.
     5. Do NOT mention specific grades or negative numbers.
     \`;
  } else if (style === GenerationStyle.DETAILED) {
     openingInstruction = \`Start with a polite greeting to the parents (e.g., "שלום וברכה"). Address the student by name (\${student.firstName}).\`;
     styleInstructions = "Include specific grades, detailed behavioral notes, absences, lates, and specific events mentioned in the data. Provide a comprehensive update.";
  } else {
     openingInstruction = \`Start with a polite greeting to the parents. Address the student by name (\${student.firstName}).\`;
     styleInstructions = \`
     Write a **GENERAL OVERVIEW** summary only.
     STRICT PROHIBITIONS:
     - DO NOT list specific grades.
     - DO NOT list specific disciplinary events.
     - DO NOT list specific subject names unless summarizing a broad category.
     FOCUS ON:
     - The overall trend (Is the student improving? Stable? Struggling?).
     - General attitude, effort, and attendance patterns as a whole.
     - A holistic view of the student's status in the class.
     \`;
  }

  return \`
  Student Name: \${student.fullName}
  First Name: \${student.firstName}
  Teacher Name: \${teacherName}
  
  Data from various subjects (Grades, Behavior, Absences, Comments):
  \${dataDescription}

  Task: Write a message based on the data above.
  
  Specific Instructions:
  1. \${openingInstruction}
  2. \${styleInstructions}
  3. \${customInstructions}
  
  Ensure the message is written entirely in \${targetLanguage} and signed by \${teacherName}.
  \`;
};`,

  'src/components/FileUpload.tsx': `import React, { useCallback } from 'react';

interface FileUploadProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (fileName: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ files, onFilesSelected, onRemoveFile }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  }, [onFilesSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="space-y-4">
        <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer bg-white shadow-sm"
        >
        <input
            type="file"
            id="fileInput"
            multiple
            className="hidden"
            onChange={handleFileChange}
        />
        <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-lg font-medium text-slate-700">גרירת קבצים או לחיצה להעלאה</span>
            <span className="text-sm text-slate-500">תומך בקבצי Excel ו-CSV</span>
        </label>
        </div>
        {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
                {files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-100 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-70">
                            <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate max-w-[150px]" title={file.name}>{file.name}</span>
                        <button onClick={() => onRemoveFile(file.name)} className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};`,

  'src/components/StudentTable.tsx': `import React from 'react';
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
    let cleanPhone = phone.replace(/\\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '972' + cleanPhone.substring(1);
    window.open(\`https://web.whatsapp.com/send?phone=\${cleanPhone}&text=\${encodedText}\`, '_blank');
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
              <tr key={student.id} className={\`group hover:bg-slate-50 transition-colors \${!student.isSelected ? 'opacity-50 grayscale-[0.5]' : ''}\`}>
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
                             <span className={\`\${isOutlier(sub.grade) ? 'font-bold text-red-500' : 'text-slate-600'}\`}>
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
};`,

  'src/components/StudentDetailsModal.tsx': `import React from 'react';
import { Student } from '../types';

interface StudentDetailsModalProps {
  student: Student;
  onClose: () => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ student, onClose }) => {
  const IGNORED_HEADERS = [
      'מס', 'מספר', 'מס.', 'מס\\'', 'no', 'no.', 'num', 'id', 'index', 
      'כיתה', 'class', 'שכבה', 'grade level', 'ת.ז', 'tz', 'group', 'קב', 'קבוצה', 'טור',
      'סה"כ', 'סה״כ', 'סך הכל', 'סיכום', 'total', 'sum', 'count', 'amount', 'מונה', 'counter'
  ];
  const NON_GRADE_KEYWORDS = [
      'שיעורי בית', 'ש.ב', 'ש״ב', 'homework', 'hw', 'תלבושת', 'uniform', 'ציוד', 'equipment', 
      'הערכה', 'eval', 'effort', 'התנהגות', 'behavior', 'חיסור', 'absence', 'חיסורים',
      'איחור', 'late', 'איחורים', 'משמעת', 'discipline', 'מילה טובה', 'מילים טובות', 
      'הצטיינות', 'הצטיינויות', 'commendation', 'נחת', 'חיזוק', 'חיזוקים', 'מחמאה', 'מחמאות', 
      'הערות', 'comment', 'note', 'פרגון', 'נקודות זכות', 'זכות', 'שבח', 'לשבח', 'נקודת אור', 'נקודות אור',
      'אירועים', 'events', 'incident'
  ];
  const BEHAVIOR_KEYWORDS = [
      'איחור', 'חיסור', 'הפרעה', 'ציוד', 'שוטטות', 'חוצפה', 'אי השתתפות', 'אלימות', 'תלבושת', 'שיעורי בית', 'ש.ב', 'ש״ב', 'שלילי', 'משמעת',
      'late', 'absence', 'violence', 'equipment', 'behavior', 'comment', 'note', 'uniform', 'homework', 'negative'
  ];
  const NEGATIVE_COUNT_KEYWORDS = [
      'אי הכנת', 'לא הכין', 'חוסר', 'missing', 'not done', 'fail', 'שלילי', 'negative', 
      'הפרעות', 'איחורים', 'חיסורים', 'ביקור בית', 'הרחקה', 'השעיה', 'אי הכנה'
  ];
  const POSITIVE_KEYWORDS = [
      'מילה טובה', 'מילים טובות', 'הצטיינות', 'הצטיינויות', 'חיובי', 'שיפור', 'נחת', 
      'excellent', 'good', 'commendation', 'positive', 'חיוביים', 'חיזוק', 'חיזוקים', 
      'מחמאה', 'מחמאות', 'ראוי לשבח', 'צל"ש', 'פרגון', 'נקודת אור', 'נקודות אור', 'זכות'
  ];

  const normalizeKey = (key: string) => key.toLowerCase().replace(/[-_.\\"\\']/g, ' ');

  const isPositive = (key: string, val: any) => {
    const lowerKey = normalizeKey(key);
    const str = (key + ' ' + val).toLowerCase();
    return POSITIVE_KEYWORDS.some(k => lowerKey.includes(k) || str.includes(k));
  };

  const isNegative = (key: string, val: any) => {
    const lowerKey = normalizeKey(key);
    const str = (key + ' ' + val).toLowerCase();
    if (NEGATIVE_COUNT_KEYWORDS.some(k => lowerKey.includes(k))) {
        const num = parseFloat(val);
        if (!isNaN(num)) return num > 0;
        return val && val !== 0 && val !== '0' && val !== '-';
    }
    if (BEHAVIOR_KEYWORDS.some(k => lowerKey.includes(k))) {
        if (lowerKey.includes('שיעורי בית') || lowerKey.includes('homework') || lowerKey.includes('ש.ב')) {
             return val === 0 || val === 'לא' || String(val).includes('לא') || String(val).includes('not');
        }
        if (lowerKey.includes('ציוד') || lowerKey.includes('equipment')) {
             return val === 0 || val === 'לא' || String(val).includes('לא') || String(val).includes('חסר');
        }
        return true; 
    }
    return BEHAVIOR_KEYWORDS.some(k => str.includes(k));
  };

  const isGrade = (key: string, val: any) => {
    const lowerKey = normalizeKey(key);
    if (isPositive(key, val) || isNegative(key, val)) return false;
    if (IGNORED_HEADERS.some(h => lowerKey === h || lowerKey.includes(h + ' ') || lowerKey.startsWith(h))) return false;
    if (NON_GRADE_KEYWORDS.some(k => lowerKey.includes(k))) return false;
    if (lowerKey.includes('מורה') || lowerKey.includes('teacher')) return false;
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 100) return true;
    return false;
  };

  const grades: any[] = [];
  const negatives: any[] = [];
  const positives: any[] = [];
  const others: any[] = [];

  student.subjects.forEach(sub => {
    Object.entries(sub).forEach(([key, val]) => {
        if (key === 'subjectName') return;
        const item = { source: sub.subjectName, key, val };
        if (isPositive(key, val)) positives.push(item);
        else if (isNegative(key, val)) negatives.push(item);
        else if (isGrade(key, val)) grades.push(item);
        else others.push(item);
    });
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity backdrop-blur-sm" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="relative inline-block align-bottom bg-white rounded-2xl text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-slate-200">
          <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
            <div>
                <h3 className="text-2xl font-bold">תיק תלמיד: {student.fullName}</h3>
                <p className="text-indigo-200 text-sm mt-1">מזהה מערכת: {student.id.slice(0, 8)}</p>
            </div>
            <button onClick={onClose} className="text-indigo-200 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="px-6 py-6 max-h-[75vh] overflow-y-auto bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="text-lg font-bold text-indigo-700 mb-4 border-b border-indigo-50 pb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                        הישגים לימודיים וציונים
                    </h4>
                    {grades.length > 0 ? (
                        <ul className="space-y-3">
                            {grades.map((g, i) => (
                                <li key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-700">{g.key}</span>
                                        <span className="text-xs text-slate-400">{g.source}</span>
                                    </div>
                                    <span className={\`font-bold px-2 py-1 rounded text-sm \${parseFloat(g.val) < 60 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}\`}>
                                        {g.val}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-slate-400 text-sm">אין נתוני ציונים</p>}
                </div>
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <h4 className="text-lg font-bold text-red-600 mb-4 border-b border-red-50 pb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            אירועי משמעת והתנהגות
                        </h4>
                        {negatives.length > 0 ? (
                            <ul className="space-y-2">
                                {negatives.map((item, i) => (
                                    <li key={i} className="bg-red-50 border-r-4 border-red-400 p-2 rounded text-sm text-red-800">
                                        <div className="font-bold">{item.key}</div>
                                        <div>{item.val} <span className="text-xs text-red-400">({item.source})</span></div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-slate-400 text-sm">לא נרשמו אירועים חריגים</p>}
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <h4 className="text-lg font-bold text-emerald-600 mb-4 border-b border-emerald-50 pb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            נקודות אור וחיזוקים
                        </h4>
                        {positives.length > 0 ? (
                            <ul className="space-y-2">
                                {positives.map((item, i) => (
                                    <li key={i} className="bg-emerald-50 border-r-4 border-emerald-400 p-2 rounded text-sm text-emerald-800">
                                        <div className="font-bold">{item.key}</div>
                                        <div>{item.val} <span className="text-xs text-emerald-600">({item.source})</span></div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-slate-400 text-sm">אין רישומי הצטיינות כרגע</p>}
                    </div>
                </div>
            </div>
            {others.length > 0 && (
                <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                     <h4 className="text-lg font-bold text-slate-600 mb-4 border-b border-slate-100 pb-2">נתונים כלליים נוספים</h4>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {others.map((item, i) => (
                            <div key={i} className="bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="block text-xs text-slate-400">{item.key} ({item.source})</span>
                                <span className="block font-medium text-slate-700">{item.val}</span>
                            </div>
                        ))}
                     </div>
                </div>
            )}
          </div>
          <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse">
            <button onClick={onClose} className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">סגור תיק</button>
          </div>
        </div>
      </div>
    </div>
  );
};`,

  'src/components/AnalyticsDashboard.tsx': `import React, { useMemo } from 'react';
import { Student } from '../types';

interface AnalyticsDashboardProps {
  students: Student[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ students }) => {
  const extractScore = (val: any): number => {
    const str = String(val).trim();
    if (/^-?\\d+(\\.\\d+)?$/.test(str)) return parseFloat(str);
    return NaN;
  };
  const normalizeKey = (key: string) => key.toLowerCase().replace(/[-_.\\"\\']/g, ' ');

  const stats = useMemo(() => {
    if (students.length === 0) return null;
    let totalGrades = 0;
    let gradeCount = 0;
    const gradeDistribution = { excellent: 0, good: 0, average: 0, failing: 0 };
    const behaviorStats = {
        positive: 0, negative: 0, homeworkIssues: 0,
        specific: { lates: 0, absences: 0, disturbance: 0, noEquipment: 0, insolence: 0 }
    };
    const subjectStats: Record<string, { sum: number, count: number, min: number, max: number }> = {};
    const IGNORED_HEADERS = [
        'מס', 'מספר', 'מס.', 'מס\\'', 'no', 'no.', 'num', 'id', 'index', 
        'כיתה', 'class', 'שכבה', 'grade level', 'ת.ז', 'tz', 'group', 'קב', 'קבוצה', 'טור',
        'סה"כ', 'סה״כ', 'סך הכל', 'סיכום', 'total', 'sum', 'count', 'amount', 'מונה', 'counter'
    ];
    const NON_GRADE_KEYWORDS = [
        'שיעורי בית', 'ש.ב', 'ש״ב', 'homework', 'hw', 'h.w', 'תלבושת', 'uniform', 'ציוד', 'equipment', 
        'הערכה', 'eval', 'effort', 'התנהגות', 'behavior', 'חיסור', 'absence', 'חיסורים',
        'איחור', 'late', 'איחורים', 'בונוס', 'bonus', 'מילה טובה', 'מילים טובות', 'הצטיינות', 'הצטיינויות', 'commendation', 
        'נחת', 'חיזוק', 'חיזוקים', 'מחמאה', 'מחמאות', 'הערות', 'comment', 'note',
        'פרגון', 'נקודות זכות', 'זכות', 'שבח', 'לשבח', 'נקודת אור', 'נקודות אור', 'אירועים', 'events', 'incident'
    ];

    const studentAverages = students.map(s => {
      let sum = 0;
      let count = 0;
      s.subjects.forEach(sub => {
        if (!subjectStats[sub.subjectName]) subjectStats[sub.subjectName] = { sum: 0, count: 0, min: 100, max: 0 };
        Object.entries(sub).forEach(([key, val]) => {
            if(key === 'subjectName') return;
            const lowerKey = normalizeKey(key);
            const strVal = (lowerKey + ' ' + val).toLowerCase();
            const isNonGradeHeader = NON_GRADE_KEYWORDS.some(k => lowerKey.includes(k));
            let isBehavior = false;
            if (strVal.includes('איחור') || strVal.includes('late') || (lowerKey.includes('איחור') && val > 0)) { behaviorStats.negative++; behaviorStats.specific.lates++; isBehavior = true; }
            else if (strVal.includes('חיסור') || strVal.includes('absence') || (lowerKey.includes('חיסור') && val > 0)) { behaviorStats.negative++; behaviorStats.specific.absences++; isBehavior = true; }
            else if (strVal.includes('הפרעה') || strVal.includes('disturb')) { behaviorStats.negative++; behaviorStats.specific.disturbance++; isBehavior = true; }
            else if (strVal.includes('ציוד') || strVal.includes('equipment') || (lowerKey.includes('ציוד') && (val === 0 || val === 'לא'))) { behaviorStats.negative++; behaviorStats.specific.noEquipment++; isBehavior = true; }
            else if (strVal.includes('חוצפה') || strVal.includes('insolence')) { behaviorStats.negative++; behaviorStats.specific.insolence++; isBehavior = true; }
            else if (lowerKey.includes('שיעורי בית') && (val === 0 || val === 'לא' || strVal.includes('לא'))) { behaviorStats.homeworkIssues++; isBehavior = true; }
            else if (strVal.includes('מילה טובה') || strVal.includes('הצטיינות') || strVal.includes('excellent') || strVal.includes('נחת') || strVal.includes('חיזוק')) { behaviorStats.positive++; isBehavior = true; }
            if (['אי הכנת', 'לא הכין', 'חוסר', 'missing'].some(k => lowerKey.includes(k))) {
                if (parseFloat(val) > 0) { 
                    behaviorStats.negative++; 
                    if(lowerKey.includes('שיעורי בית') || lowerKey.includes('ש.ב')) behaviorStats.homeworkIssues++;
                }
                isBehavior = true; 
            }
            const isIgnored = IGNORED_HEADERS.some(h => lowerKey === h || lowerKey.includes(h + ' ') || lowerKey.startsWith(h));
            if (!isBehavior && !isIgnored && !isNonGradeHeader && !lowerKey.includes('מורה')) {
                const num = extractScore(val);
                if (!isNaN(num) && num >= 0 && num <= 100) {
                    sum += num;
                    count++;
                    totalGrades += num;
                    gradeCount++;
                    subjectStats[sub.subjectName].sum += num;
                    subjectStats[sub.subjectName].count++;
                    if (num < subjectStats[sub.subjectName].min) subjectStats[sub.subjectName].min = num;
                    if (num > subjectStats[sub.subjectName].max) subjectStats[sub.subjectName].max = num;
                    if (num >= 90) gradeDistribution.excellent++;
                    else if (num >= 75) gradeDistribution.good++;
                    else if (num >= 55) gradeDistribution.average++;
                    else gradeDistribution.failing++;
                }
            }
        });
      });
      return { id: s.id, name: s.fullName, average: count > 0 ? sum / count : 0, hasGrades: count > 0 };
    }).filter(s => s.hasGrades);

    const sortedByAvg = [...studentAverages].sort((a, b) => b.average - a.average);
    const processedSubjectStats = Object.entries(subjectStats)
        .map(([name, data]) => ({ name, avg: data.count > 0 ? data.sum / data.count : 0, min: data.count > 0 ? data.min : 0, max: data.count > 0 ? data.max : 0 }))
        .sort((a, b) => b.avg - a.avg);
    const totalDist = gradeDistribution.excellent + gradeDistribution.good + gradeDistribution.average + gradeDistribution.failing;
    const distPercents = {
        excellent: totalDist ? (gradeDistribution.excellent / totalDist) * 100 : 0,
        good: totalDist ? (gradeDistribution.good / totalDist) * 100 : 0,
        average: totalDist ? (gradeDistribution.average / totalDist) * 100 : 0,
        failing: totalDist ? (gradeDistribution.failing / totalDist) * 100 : 0,
    };
    const donutGradient = \`conic-gradient(#F87171 0% \${distPercents.failing}%, #FACC15 \${distPercents.failing}% \${distPercents.failing + distPercents.average}%, #60A5FA \${distPercents.failing + distPercents.average}% \${distPercents.failing + distPercents.average + distPercents.good}%, #34D399 \${distPercents.failing + distPercents.average + distPercents.good}% 100%)\`;
    return { classAverage: gradeCount > 0 ? totalGrades / gradeCount : 0, gradeDistribution, distPercents, donutGradient, topStudents: sortedByAvg.slice(0, 5), strugglingStudents: sortedByAvg.filter(s => s.average < 60).slice(0, 5), studentCount: students.length, behaviorStats, subjectStats: processedSubjectStats };
  }, [students]);

  if (!stats) return <div className="p-8 text-center text-slate-500">אין מספיק נתונים לניתוח</div>;

  return (
    <div className="space-y-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-indigo-100 font-medium mb-1">ממוצע כיתתי</p>
                    <h3 className="text-4xl font-bold">{stats.classAverage.toFixed(1)}</h3>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-20 transform rotate-12">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-slate-500 font-medium mb-1">מצטיינים (מעל 90)</p>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.gradeDistribution.excellent} <span className="text-base font-normal text-slate-400">תלמידים</span></h3>
                </div>
                <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-slate-500 font-medium mb-1">מדד התנהגות (חיובים)</p>
                    <h3 className="text-3xl font-bold text-slate-800">{stats.behaviorStats.positive} <span className="text-base font-normal text-slate-400">אירועים</span></h3>
                </div>
                 <div className="bg-yellow-100 p-3 rounded-full text-yellow-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-1">
                <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">התפלגות ציונים</h3>
                <div className="flex flex-col items-center justify-center">
                    <div className="relative w-48 h-48 rounded-full shadow-inner mb-6" style={{ background: stats.donutGradient }}>
                        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center flex-col">
                             <span className="text-3xl font-bold text-slate-800">{stats.studentCount}</span>
                             <span className="text-xs text-slate-400">תלמידים</span>
                        </div>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded-full bg-emerald-400"></div> <span className="text-slate-600">מצויין (90+): <b>{stats.gradeDistribution.excellent}</b></span> </div>
                        <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded-full bg-blue-400"></div> <span className="text-slate-600">טוב (75-89): <b>{stats.gradeDistribution.good}</b></span> </div>
                        <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded-full bg-yellow-400"></div> <span className="text-slate-600">בינוני (55-74): <b>{stats.gradeDistribution.average}</b></span> </div>
                        <div className="flex items-center gap-2"> <div className="w-3 h-3 rounded-full bg-red-400"></div> <span className="text-slate-600">נכשל (0-54): <b>{stats.gradeDistribution.failing}</b></span> </div>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-bold text-slate-800 mb-6">ביצועים לפי מקצוע (ממוצע וטווח כיתתי)</h3>
                <div className="space-y-6">
                    {stats.subjectStats.map((sub, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-slate-700 w-24 truncate" title={sub.name}>{sub.name}</span>
                                <div className="flex-1 mx-4 relative h-8">
                                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-slate-100 rounded-full"></div>
                                    <div className="absolute top-1/2 -translate-y-1/2 h-2 bg-indigo-200 rounded-full" style={{ right: \`\${100 - sub.max}%\`, left: \`\${sub.min}%\` }}></div>
                                    <div className={\`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow \${sub.avg >= 85 ? 'bg-emerald-500' : sub.avg >= 70 ? 'bg-blue-500' : sub.avg >= 55 ? 'bg-yellow-500' : 'bg-red-500'}\`} style={{ left: \`\${sub.avg}%\` }} title={\`ממוצע: \${sub.avg.toFixed(1)}\`}></div>
                                </div>
                                <span className="text-sm font-bold text-slate-600 w-12 text-left">{sub.avg.toFixed(0)}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-center gap-6 text-xs text-slate-500">
                    <div className="flex items-center gap-1"><div className="w-3 h-1 bg-indigo-200"></div> טווח ציונים (נמוך-גבוה)</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> ממוצע כיתתי</div>
                </div>
            </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">ניתוח משמעת והתנהגות</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                    <div className="text-red-500 mb-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                    <span className="block text-2xl font-bold text-red-900">{stats.behaviorStats.specific.lates + stats.behaviorStats.specific.absences}</span>
                    <span className="text-xs text-red-600 font-medium">איחורים וחיסורים</span>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
                     <div className="text-orange-500 mb-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></div>
                    <span className="block text-2xl font-bold text-orange-900">{stats.behaviorStats.homeworkIssues}</span>
                    <span className="text-xs text-orange-600 font-medium">אי הכנת ש.ב</span>
                </div>
                 <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                     <div className="text-purple-500 mb-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg></div>
                    <span className="block text-2xl font-bold text-purple-900">{stats.behaviorStats.specific.disturbance + stats.behaviorStats.specific.insolence}</span>
                    <span className="text-xs text-purple-600 font-medium">הפרעות/משמעת</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                     <div className="text-slate-500 mb-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>
                    <span className="block text-2xl font-bold text-slate-900">{stats.behaviorStats.specific.noEquipment}</span>
                    <span className="text-xs text-slate-600 font-medium">חוסר ציוד</span>
                </div>
            </div>
        </div>
    </div>
  );
};`,

  'src/components/TrendsDashboard.tsx': `import React, { useMemo } from 'react';
import { Student } from '../types';

interface TrendsDashboardProps {
  students: Student[];
}

export const TrendsDashboard: React.FC<TrendsDashboardProps> = ({ students }) => {
  const extractScore = (val: any): number => {
    const str = String(val).trim();
    if (/^-?\\d+(\\.\\d+)?$/.test(str)) return parseFloat(str);
    return NaN;
  };
  const normalizeKey = (key: string) => key.toLowerCase().replace(/[-_.\\"\\']/g, ' ');

  const trends = useMemo(() => {
    const IGNORED_HEADERS = [
        'מס', 'מספר', 'מס.', 'מס\\'', 'no', 'no.', 'num', 'id', 'index', 
        'כיתה', 'class', 'שכבה', 'grade level', 'ת.ז', 'tz', 'group', 'קב', 'קבוצה', 'טור',
        'סה"כ', 'סה״כ', 'סך הכל', 'סיכום', 'total', 'sum', 'count', 'amount', 'מונה', 'counter'
    ];
    const NON_GRADE_KEYWORDS = [
        'שיעורי בית', 'ש.ב', 'ש״ב', 'homework', 'hw', 'תלבושת', 'uniform', 'ציוד', 'equipment', 
        'הערכה', 'eval', 'effort', 'התנהגות', 'behavior', 'חיסור', 'absence', 'חיסורים',
        'איחור', 'late', 'איחורים', 'מילה טובה', 'מילים טובות', 'הצטיינות', 'הצטיינויות', 'commendation', 
        'נחת', 'חיזוק', 'חיזוקים', 'מחמאה', 'מחמאות', 'הערות', 'comment', 'note',
        'פרגון', 'נקודות זכות', 'זכות', 'שבח', 'לשבח', 'נקודת אור', 'נקודות אור', 'אירועים', 'events', 'incident'
    ];
    const results = students.map(s => {
        let allGrades: number[] = [];
        let negativeEvents = 0;
        let positiveEvents = 0;
        s.subjects.forEach(sub => {
            Object.entries(sub).forEach(([key, val]) => {
                if(key === 'subjectName') return;
                const lowerKey = normalizeKey(key);
                const strVal = (lowerKey + ' ' + val).toLowerCase();
                let isBehavior = false;
                const isNonGradeHeader = NON_GRADE_KEYWORDS.some(k => lowerKey.includes(k));
                if (['איחור', 'חיסור', 'הפרעה', 'late', 'absence', 'violence', 'ציוד', 'equipment', 'חוצפה', 'שלילי', 'משמעת', 'homework', 'שיעורי בית', 'ש.ב'].some(k => strVal.includes(k) || lowerKey.includes(k))) {
                     if (lowerKey.includes('homework') || lowerKey.includes('שיעורי בית') || lowerKey.includes('ש.ב')) {
                         if (val === 0 || val === 'לא' || strVal.includes('לא')) negativeEvents++;
                     } else {
                         if (typeof val === 'number' && val > 0) negativeEvents++; 
                         else if (typeof val === 'string') negativeEvents++; 
                     }
                     isBehavior = true;
                }
                if (['אי הכנת', 'לא הכין', 'חוסר', 'missing'].some(k => lowerKey.includes(k))) {
                    if (parseFloat(val) > 0) negativeEvents++;
                    isBehavior = true;
                }
                if (['מילה טובה', 'הצטיינות', 'excellent', 'commendation', 'חיובי', 'נחת', 'חיזוק'].some(k => strVal.includes(k) || lowerKey.includes(k))) {
                     positiveEvents++;
                     isBehavior = true;
                }
                const isIgnored = IGNORED_HEADERS.some(h => lowerKey === h || lowerKey.includes(h + ' ') || lowerKey.startsWith(h));
                if (!isBehavior && !isIgnored && !isNonGradeHeader && !lowerKey.includes('מורה')) {
                    const num = extractScore(val);
                    if (!isNaN(num) && num >= 0 && num <= 100) { allGrades.push(num); }
                }
            });
        });
        let trend: 'improving' | 'declining' | 'stable' | 'insufficient' = 'insufficient';
        let diff = 0;
        if (allGrades.length >= 2) {
            const mid = Math.floor(allGrades.length / 2);
            const firstHalf = allGrades.slice(0, mid);
            const secondHalf = allGrades.slice(mid);
            const avg1 = firstHalf.reduce((a,b) => a+b, 0) / firstHalf.length;
            const avg2 = secondHalf.reduce((a,b) => a+b, 0) / secondHalf.length;
            diff = avg2 - avg1;
            if (diff > 3) trend = 'improving';
            else if (diff < -3) trend = 'declining';
            else trend = 'stable';
        }
        return {
            id: s.id, name: s.fullName, gradesCount: allGrades.length, negativeEvents, positiveEvents, trend, diff,
            avg: allGrades.length > 0 ? (allGrades.reduce((a,b)=>a+b,0)/allGrades.length) : 0
        };
    });
    return results.sort((a,b) => b.avg - a.avg);
  }, [students]);

  const topImproving = useMemo(() => trends.filter(t => t.trend === 'improving').sort((a,b) => b.diff - a.diff).slice(0, 3), [trends]);
  const mostDeclining = useMemo(() => trends.filter(t => t.trend === 'declining').sort((a,b) => a.diff - b.diff).slice(0, 3), [trends]);
  const topBehavior = useMemo(() => trends.sort((a,b) => b.positiveEvents - a.positiveEvents).slice(0, 3), [trends]);

  return (
    <div className="space-y-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 shadow-sm">
                <h3 className="text-emerald-800 font-bold mb-3 flex items-center gap-2"><span className="text-xl">📈</span> במגמת עלייה</h3>
                <div className="space-y-3">
                    {topImproving.length > 0 ? topImproving.map(t => (
                        <div key={t.id} className="bg-white p-2 rounded-lg shadow-sm flex justify-between items-center text-sm">
                            <span className="font-medium">{t.name}</span>
                            <span className="text-emerald-600 font-bold">+{t.diff.toFixed(1)}</span>
                        </div>
                    )) : <p className="text-sm text-emerald-600/70">לא זוהו תלמידים במגמת עלייה מובהקת</p>}
                </div>
            </div>
            <div className="bg-red-50 rounded-2xl p-5 border border-red-100 shadow-sm">
                <h3 className="text-red-800 font-bold mb-3 flex items-center gap-2"><span className="text-xl">📉</span> דורשים חיזוק (ירידה)</h3>
                <div className="space-y-3">
                    {mostDeclining.length > 0 ? mostDeclining.map(t => (
                        <div key={t.id} className="bg-white p-2 rounded-lg shadow-sm flex justify-between items-center text-sm">
                            <span className="font-medium">{t.name}</span>
                            <span className="text-red-600 font-bold">{t.diff.toFixed(1)}</span>
                        </div>
                    )) : <p className="text-sm text-red-600/70">לא זוהו תלמידים בירידה מובהקת</p>}
                </div>
            </div>
            <div className="bg-yellow-50 rounded-2xl p-5 border border-yellow-100 shadow-sm">
                <h3 className="text-yellow-800 font-bold mb-3 flex items-center gap-2"><span className="text-xl">⭐</span> מצטייני התנהגות</h3>
                <div className="space-y-3">
                    {topBehavior.filter(t => t.positiveEvents > 0).length > 0 ? topBehavior.filter(t => t.positiveEvents > 0).map(t => (
                        <div key={t.id} className="bg-white p-2 rounded-lg shadow-sm flex justify-between items-center text-sm">
                            <span className="font-medium">{t.name}</span>
                            <span className="text-yellow-600 font-bold">{t.positiveEvents} חיזוקים</span>
                        </div>
                    )) : <p className="text-sm text-yellow-600/70">לא נרשמו חיזוקים מיוחדים</p>}
                </div>
            </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
             <h2 className="text-lg font-bold text-slate-800 mb-2">מיפוי כיתתי: הישגים מול התנהגות</h2>
             <p className="text-sm text-slate-500 mb-6">ציר ה-X: ממוצע ציונים (ימינה = גבוה יותר), ציר ה-Y: אירועי משמעת (למעלה = יותר אירועים).</p>
             <div className="relative h-64 border-l border-b border-slate-300 bg-slate-50/50 m-4">
                 <div className="absolute -left-8 top-1/2 -rotate-90 text-xs text-slate-400 font-medium">אירועי משמעת</div>
                 <div className="absolute bottom-[-25px] left-1/2 text-xs text-slate-400 font-medium">ממוצע ציונים</div>
                 {trends.map(t => {
                     const x = t.avg;
                     const y = Math.min(t.negativeEvents * 10, 100); 
                     let color = 'bg-blue-500';
                     if (t.avg < 60) color = 'bg-red-500';
                     else if (t.avg > 85 && t.negativeEvents < 2) color = 'bg-emerald-500';
                     else if (t.avg > 85 && t.negativeEvents > 3) color = 'bg-orange-500';
                     return (
                         <div key={t.id} className={\`absolute w-3 h-3 rounded-full shadow-sm border border-white hover:scale-150 transition-transform cursor-pointer group \${color}\`} style={{ left: \`\${x}%\`, bottom: \`\${y}%\` }}>
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">{t.name} (ציון: {t.avg.toFixed(0)}, משמעת: {t.negativeEvents})</div>
                         </div>
                     );
                 })}
             </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-2">פירוט מלא</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">שם התלמיד</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-1/4">מגמת ציונים</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">ממוצע ציונים (מתוקן)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">בעיות משמעת/ש.ב</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {trends.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{t.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        {t.trend === 'improving' && <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-bold">+{t.diff.toFixed(1)}</span>}
                                        {t.trend === 'declining' && <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-bold">{t.diff.toFixed(1)}</span>}
                                        {t.trend === 'stable' && <span className="text-slate-400 text-xs">יציב</span>}
                                        {t.trend === 'insufficient' && <span className="text-slate-300 text-xs">-</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">{t.avg.toFixed(1)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {t.negativeEvents > 0 ? (
                                        <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${t.negativeEvents > 3 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}\`}>
                                            {t.negativeEvents} אירועים
                                        </span>
                                    ) : <span className="text-slate-300 text-xs">-</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};`,

  'src/App.tsx': `import React, { useState, useRef, useEffect } from 'react';
import { processFiles } from './services/dataProcessor';
import { generateStudentMessage } from './services/geminiService';
import { Student, GeneratedMessage, GenerationStyle } from './types';
import { FileUpload } from './components/FileUpload';
import { StudentTable } from './components/StudentTable';
import { StudentDetailsModal } from './components/StudentDetailsModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TrendsDashboard } from './components/TrendsDashboard';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Record<string, GeneratedMessage>>({});
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStyle, setGenerationStyle] = useState<GenerationStyle>(GenerationStyle.DETAILED);
  const [customInstructions, setCustomInstructions] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [showTeacherNameError, setShowTeacherNameError] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [currentView, setCurrentView] = useState<'table' | 'analytics' | 'trends'>('table');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem('morai_messages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) { console.error("Failed to load history", e); }
    }
    const savedTeacherName = localStorage.getItem('morai_teacher_name');
    if (savedTeacherName) { setTeacherName(savedTeacherName); }
  }, []);

  useEffect(() => {
    if (Object.keys(messages).length > 0) {
      localStorage.setItem('morai_messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
      localStorage.setItem('morai_teacher_name', teacherName);
      if (teacherName.trim()) setShowTeacherNameError(false);
  }, [teacherName]);

  const processStudentData = async (filesToProcess: File[]) => {
      setIsProcessingFiles(true);
      try {
        const newStudents = await processFiles(filesToProcess);
        if (newStudents.length === 0) {
            alert("לא נמצאו נתוני תלמידים בקבצים. אנא וודא שיש עמודת 'שם תלמיד' או שמות בעברית.");
            setStudents([]);
            return;
        }
        const map = new Map<string, Student>();
        newStudents.forEach((s: Student) => {
          if (map.has(s.fullName)) {
             const existing = map.get(s.fullName)!;
             existing.subjects = [...existing.subjects, ...s.subjects];
             if(!existing.phoneNumber && s.phoneNumber) existing.phoneNumber = s.phoneNumber;
             if(!existing.language && s.language) existing.language = s.language;
          } else { map.set(s.fullName, s); }
        });
        setStudents(Array.from(map.values()));
      } catch (error) {
        console.error("Error processing files", error);
        alert("שגיאה בעיבוד הקבצים.");
      } finally { setIsProcessingFiles(false); }
  };

  const handleFilesSelected = async (files: File[]) => {
    const newFiles = files.filter(f => !uploadedFiles.some(uf => uf.name === f.name));
    if (newFiles.length === 0) return;
    const updatedFileList = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFileList);
    await processStudentData(updatedFileList);
  };

  const handleRemoveFile = async (fileName: string) => {
      const updatedFileList = uploadedFiles.filter(f => f.name !== fileName);
      setUploadedFiles(updatedFileList);
      if (updatedFileList.length === 0) { setStudents([]); } else { await processStudentData(updatedFileList); }
  };

  const handleToggleSelect = (id: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, isSelected: !s.isSelected } : s));
  };
  const handleSelectAll = (isSelected: boolean) => {
      setStudents(students.map(s => ({ ...s, isSelected })));
  };
  const handleUpdatePhone = (id: string, phone: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, phoneNumber: phone } : s));
  };
  const handleStopGeneration = () => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); setIsGenerating(false); }
  };

  const handleGenerate = async () => {
    if (!teacherName.trim()) { setShowTeacherNameError(true); return; }
    setShowTeacherNameError(false);
    const selectedStudents = students.filter(s => s.isSelected);
    if (selectedStudents.length === 0) return;
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();
    const initialMessages = { ...messages };
    selectedStudents.forEach(s => { initialMessages[s.id] = { studentId: s.id, text: '', status: 'loading', timestamp: Date.now() }; });
    setMessages(initialMessages);

    const batchSize = 3;
    for (let i = 0; i < selectedStudents.length; i += batchSize) {
        if (abortControllerRef.current?.signal.aborted) break;
        const batch = selectedStudents.slice(i, i + batchSize);
        await Promise.all(batch.map(async (student) => {
             if (abortControllerRef.current?.signal.aborted) return;
             const text = await generateStudentMessage(student, generationStyle, customInstructions, teacherName, abortControllerRef.current?.signal);
             setMessages(prev => ({
                 ...prev,
                 [student.id]: { studentId: student.id, text: text, status: text.includes('שגיאה') ? 'error' : 'success', timestamp: Date.now() }
             }));
        }));
    }
    setIsGenerating(false);
  };

  const clearHistory = () => {
    if(window.confirm("האם אתה בטוח שברצונך למחוק את היסטוריית ההודעות?")) { setMessages({}); localStorage.removeItem('morai_messages'); }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 font-sans text-slate-800 flex flex-col">
      <div className="max-w-[1600px] mx-auto space-y-8 flex-grow w-full">
        <header className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
             </div>
             <div><h1 className="text-3xl font-bold text-slate-800 tracking-tight">קשר חכם</h1><p className="text-slate-500 text-sm font-medium">ניהול קשר אישי עם הורים מבוסס AI</p></div>
          </div>
          <div className="flex gap-3 items-center">
             <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold border border-indigo-100 shadow-sm">{students.length} תלמידים</div>
             {Object.keys(messages).length > 0 && (
                 <button onClick={clearHistory} className="text-sm text-slate-500 hover:text-red-600 transition-colors font-medium px-2">נקה היסטוריה</button>
             )}
          </div>
        </header>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
            <div className="xl:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-500"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                        העלאת נתונים
                    </h2>
                    <FileUpload files={uploadedFiles} onFilesSelected={handleFilesSelected} onRemoveFile={handleRemoveFile} />
                    {isProcessingFiles && <p className="text-sm text-indigo-600 mt-3 text-center font-medium animate-pulse">מפענח נתונים מקבצים...</p>}
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                        הגדרות ניסוח
                    </h2>
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">שם המורה (לחתימה)</label>
                        <input type="text" placeholder="לדוגמה: המורה יוסף" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} className={\`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow bg-slate-50 \${showTeacherNameError ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-300'}\`} />
                        {showTeacherNameError && <p className="text-xs text-red-500 mt-1 font-medium">נא להזין שם מורה לפני יצירת ההודעות</p>}
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">סגנון הודעה</label>
                        <div className="flex flex-col gap-2 bg-slate-100 p-2 rounded-xl">
                            <button onClick={() => setGenerationStyle(GenerationStyle.DETAILED)} className={\`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all text-right \${generationStyle === GenerationStyle.DETAILED ? 'bg-white shadow-sm text-indigo-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}\`}>מפורט (ציונים והערות)</button>
                            <button onClick={() => setGenerationStyle(GenerationStyle.GENERAL)} className={\`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all text-right \${generationStyle === GenerationStyle.GENERAL ? 'bg-white shadow-sm text-indigo-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}\`}>כללי (סיכום מגמה)</button>
                            <button onClick={() => setGenerationStyle(GenerationStyle.REPORT_CARD)} className={\`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all text-right \${generationStyle === GenerationStyle.REPORT_CARD ? 'bg-white shadow-sm text-indigo-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}\`}>הערת מחנך לתעודה</button>
                        </div>
                    </div>
                    <div>
                         <label className="text-sm font-semibold text-slate-700 mb-2 block">הוראות נוספות ל-AI</label>
                         <textarea className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow bg-slate-50 resize-none" rows={3} placeholder="לדוגמה: להוסיף סמיילי בסוף, להדגיש שיפור..." value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} />
                    </div>
                    <div className="pt-2">
                        {!isGenerating ? (
                             <button onClick={handleGenerate} disabled={students.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2">
                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                                 צור הודעות ({students.filter(s => s.isSelected).length})
                             </button>
                        ) : (
                            <button onClick={handleStopGeneration} className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex justify-center items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" /></svg>
                                עצור יצירה
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="xl:col-span-3">
                 <div className="flex gap-1 mb-4 bg-slate-200/50 p-1 rounded-xl w-fit">
                    <button onClick={() => setCurrentView('table')} className={\`px-4 py-2 rounded-lg text-sm font-medium transition-all \${currentView === 'table' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/50'}\`}>רשימת תלמידים</button>
                    <button onClick={() => setCurrentView('analytics')} className={\`px-4 py-2 rounded-lg text-sm font-medium transition-all \${currentView === 'analytics' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/50'}\`}>תמונת מצב כיתתית</button>
                    <button onClick={() => setCurrentView('trends')} className={\`px-4 py-2 rounded-lg text-sm font-medium transition-all \${currentView === 'trends' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/50'}\`}>מגמות ושינויים</button>
                 </div>
                 {currentView === 'table' ? (
                     <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
                        <StudentTable students={students} messages={messages} onToggleSelect={handleToggleSelect} onUpdatePhone={handleUpdatePhone} onViewStudent={setViewingStudent} onSelectAll={handleSelectAll} />
                     </div>
                 ) : currentView === 'analytics' ? (
                     <AnalyticsDashboard students={students} />
                 ) : (
                    <TrendsDashboard students={students} />
                 )}
            </div>
        </div>
        {viewingStudent && <StudentDetailsModal student={viewingStudent} onClose={() => setViewingStudent(null)} />}
      </div>
      <footer className="w-full text-center py-6 mt-4 border-t border-slate-200">
          <p className="text-slate-500 text-sm">© כל הזכויות שמורות ל- <span className="font-semibold text-indigo-600">Toledano EdTech</span></p>
      </footer>
    </div>
  );
};

export default App;`
};

// 2. הפונקציה שיוצרת את הקבצים
function createProject() {
  console.log('🚀 מתחיל ביצירת הפרויקט...');

  Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(__dirname, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content.trim(), 'utf8');
    console.log(`✅ נוצר: ${filePath}`);
  });

  console.log('\n✨ הפרויקט נוצר בהצלחה!');
  console.log('כדי להפעיל, הרץ את הפקודות הבאות:');
  console.log('1. npm install');
  console.log('2. פתח את הקובץ .env ושם את המפתח שלך');
  console.log('3. npm run dev');
}

createProject();