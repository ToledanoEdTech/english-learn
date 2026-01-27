import { Student, SubjectRecord } from '../types';
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
       if (/^[\d.,%-]+$/.test(strVal)) { score -= 10; } 
       else if (/[\u0590-\u05FFa-zA-Z ]+/.test(strVal)) {
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
  return fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
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
        return val || `עמודה ${i + 1}`;
      });
      let nameIdx = -1;
      for (let i = 0; i < headers.length; i++) {
          const h = cleanStr(headers[i]);
          if (h.includes('מורה') || h.includes('teacher') || h.includes('מחנך')) continue;
          if (NAME_HEADERS.includes(h)) { nameIdx = i; break; }
      }
      if (nameIdx === -1) { nameIdx = detectNameColumnIndex(rawData, headerRowIndex, headers); }
      if (nameIdx === -1) { console.warn(`Could not identify name column in file: ${file.name}`); continue; }
      const phoneIdx = headers.findIndex(h => PHONE_HEADERS.some(ph => cleanStr(h).includes(ph)));
      dataRows.forEach((row) => {
        const rawName = row[nameIdx];
        if (!rawName) return;
        const fullName = String(rawName).trim();
        const lowerName = fullName.toLowerCase();
        if (fullName.length < 2) return;
        if (INVALID_ROW_KEYWORDS.some(k => lowerName.includes(k))) return;
        if (NAME_HEADERS.includes(lowerName)) return; 
        if (/^\d+$/.test(fullName.replace(/[- ]/g, ''))) return; 
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
    } catch (error) { console.error(`Error processing ${file.name}`, error); }
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
};