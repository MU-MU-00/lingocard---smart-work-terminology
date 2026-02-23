import type { Group, TermData } from '../types';
import * as XLSX from 'xlsx';

export type ExportFormat = 'json' | 'csv' | 'txt' | 'md' | 'xlsx' | 'doc';

export const FORMAT_OPTIONS: { id: ExportFormat; label: string; ext: string }[] = [
  { id: 'json', label: 'JSON', ext: '.json' },
  { id: 'csv', label: 'CSV', ext: '.csv' },
  { id: 'txt', label: 'TXT', ext: '.txt' },
  { id: 'md', label: 'Markdown', ext: '.md' },
  { id: 'xlsx', label: 'Excel', ext: '.xlsx' },
  { id: 'doc', label: 'Word', ext: '.doc' },
];

/** 各格式的文件格式说明（用于问号帮助） */
export const FORMAT_DESCRIPTIONS: Record<ExportFormat, string> = {
  json: '完整备份：包含所有词库与词条（含复习状态等），适合完整备份与恢复。',
  csv: '表格：每行一个词条，列为 术语、名称翻译、名词解释、例句，可用 Excel 打开。',
  txt: '每行一条：序号. 术语+名称翻译+名词解释+例句（四项用加号隔断）。',
  md: 'Markdown 表格：| 序号 | 术语 | 名称翻译 | 名词解释 | 例句 |，便于文档编辑。',
  xlsx: '与 CSV 列一致，Excel 工作簿格式，列：术语、名称翻译、名词解释、例句。',
  doc: '与 TXT 一致：序号. 术语+名称翻译+名词解释+例句，加号隔断，可用 Word 打开。',
};

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** 导出：词库 + 该库下的词条 */
export function exportGroup(
  group: Group,
  terms: TermData[],
  format: ExportFormat,
  filename: string
): void {
  const defaultName = `${group.name}_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}${FORMAT_OPTIONS.find(f => f.id === format)?.ext || ''}`;
  const name = filename.trim() || defaultName;
  const termList = terms.filter(t => t.groupId === group.id);

  let blob: Blob;
  let mime: string;

  switch (format) {
    case 'json': {
      const data = { groups: [group], terms: termList };
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      mime = 'application/json';
      break;
    }
    case 'csv': {
      const header = '术语,名称翻译,名词解释,例句';
      const rows = termList.map(t =>
        [t.term, t.termTranslation ?? '', t.definitionCn, t.example].map(escapeCsvCell).join(',')
      );
      const bom = '\uFEFF';
      blob = new Blob([bom + header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      mime = 'text/csv';
      break;
    }
    case 'txt':
    case 'doc': {
      const lines = termList.map((t, i) =>
        `${i + 1}. ${t.term}+${t.termTranslation ?? ''}+${t.definitionCn}+${t.example}`
      );
      const text = lines.join('\n');
      blob = new Blob([text], { type: format === 'doc' ? 'application/msword' : 'text/plain' });
      mime = format === 'doc' ? 'application/msword' : 'text/plain';
      break;
    }
    case 'md': {
      const header = '| 序号 | 术语 | 名称翻译 | 名词解释 | 例句 |';
      const sep = '|------|------|----------|----------|------|';
      const rows = termList.map((t, i) =>
        `| ${i + 1} | ${t.term} | ${t.termTranslation ?? ''} | ${t.definitionCn} | ${t.example} |`
      );
      const text = header + '\n' + sep + '\n' + rows.join('\n');
      blob = new Blob([text], { type: 'text/markdown' });
      mime = 'text/markdown';
      break;
    }
    case 'xlsx': {
      const rows = termList.map(t => [t.term, t.termTranslation ?? '', t.definitionCn, t.example]);
      const ws = XLSX.utils.aoa_to_sheet([['术语', '名称翻译', '名词解释', '例句'], ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, group.name.slice(0, 31));
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      break;
    }
    default:
      return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name.endsWith(FORMAT_OPTIONS.find(f => f.id === format)?.ext || '') ? name : name + (FORMAT_OPTIONS.find(f => f.id === format)?.ext || '');
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  terms: Omit<TermData, 'id' | 'groupId' | 'createdAt' | 'status' | 'nextReviewDate' | 'reviewStage' | 'consecutiveFailures'>[];
  groupName?: string; // 仅 JSON 可能带词库名
}

/** 从文件内容解析出词条（用于导入到指定词库或新建词库） */
export async function parseImportFile(
  file: File,
  format: ExportFormat
): Promise<ImportResult> {
  const ext = (file.name || '').toLowerCase();
  let detectedFormat = format;
  if (!format && ext) {
    if (ext.endsWith('.json')) detectedFormat = 'json';
    else if (ext.endsWith('.csv')) detectedFormat = 'csv';
    else if (ext.endsWith('.txt')) detectedFormat = 'txt';
    else if (ext.endsWith('.md')) detectedFormat = 'md';
    else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) detectedFormat = 'xlsx';
    else if (ext.endsWith('.doc') || ext.endsWith('.docx')) detectedFormat = 'doc';
  }

  const text = await file.text();
  const buf = await file.arrayBuffer();

  switch (detectedFormat) {
    case 'json': {
      const data = JSON.parse(text) as { groups?: Group[]; terms?: TermData[] };
      const terms = data.terms || [];
      const groupName = data.groups?.[0]?.name;
      return {
        terms: terms.map((t: TermData) => ({
          term: t.term,
          phonetic: t.phonetic ?? '',
          termTranslation: t.termTranslation,
          definitionEn: t.definitionEn ?? '',
          definitionCn: t.definitionCn ?? '',
          example: t.example ?? '',
          wrongDefinitions: Array.isArray(t.wrongDefinitions) ? t.wrongDefinitions : [],
        })),
        groupName,
      };
    }
    case 'csv': {
      const lines = text.split(/\r?\n/).filter(Boolean);
      function parseCsvLine(line: string): string[] {
        const out: string[] = [];
        let cell = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            if (inQuotes && line[i + 1] === '"') { cell += '"'; i++; }
            else inQuotes = !inQuotes;
          } else if (c === ',' && !inQuotes) {
            out.push(cell);
            cell = '';
          } else {
            cell += c;
          }
        }
        out.push(cell);
        return out;
      }
      const simple = lines.map(parseCsvLine);
      const header = simple[0] || [];
      const dataRows = simple.slice(1);
      const termIdx = header.findIndex(h => /术语|term/i.test(h));
      const transIdx = header.findIndex(h => /名称翻译|翻译/i.test(h));
      const defIdx = header.findIndex(h => /名词解释|定义|definition/i.test(h));
      const exIdx = header.findIndex(h => /例句|example/i.test(h));
      const terms = dataRows.map(row => ({
        term: row[termIdx] ?? row[0] ?? '',
        phonetic: '',
        termTranslation: (transIdx >= 0 ? row[transIdx] : '') || undefined,
        definitionEn: '',
        definitionCn: defIdx >= 0 ? row[defIdx] : (row[2] ?? ''),
        example: exIdx >= 0 ? row[exIdx] : (row[3] ?? ''),
        wrongDefinitions: [] as string[],
      })).filter(t => t.term.trim());
      return { terms };
    }
    case 'txt':
    case 'doc': {
      const lines = text.split(/\r?\n/).filter(Boolean);
      const terms = lines.map(line => {
        const match = line.match(/^\s*\d+\.\s*(.+)$/);
        const rest = match ? match[1] : line;
        const parts = rest.split('+').map(s => s.trim());
        return {
          term: parts[0] ?? '',
          phonetic: '',
          termTranslation: parts[1] || undefined,
          definitionEn: '',
          definitionCn: parts[2] ?? '',
          example: parts[3] ?? '',
          wrongDefinitions: [] as string[],
        };
      }).filter(t => t.term.trim());
      return { terms };
    }
    case 'md': {
      const lines = text.split(/\r?\n/);
      const tableStart = lines.findIndex(l => l.trim().startsWith('|'));
      if (tableStart === -1) return { terms: [] };
      const headerLine = lines[tableStart];
      const sepLine = lines[tableStart + 1];
      if (!sepLine || !/^\|[\s\-|]+\|/.test(sepLine)) return { terms: [] };
      const rows = lines.slice(tableStart + 2).filter(l => l.trim().startsWith('|'));
      const parseRow = (row: string) => row.split('|').slice(1, -1).map(c => c.trim());
      const terms = rows.map(row => {
        const cells = parseRow(row);
        return {
          term: cells[0] ?? '',
          phonetic: '',
          termTranslation: cells[1] || undefined,
          definitionEn: '',
          definitionCn: cells[2] ?? '',
          example: cells[3] ?? '',
          wrongDefinitions: [] as string[],
        };
      }).filter(t => t.term.trim());
      return { terms };
    }
    case 'xlsx': {
      const wb = XLSX.read(buf, { type: 'array' });
      const first = wb.SheetNames[0];
      const ws = wb.Sheets[first];
      const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
      if (!data.length) return { terms: [] };
      const header = (data[0] as string[]).map(String);
      const termIdx = header.findIndex(h => /术语|term/i.test(h));
      const transIdx = header.findIndex(h => /名称翻译|翻译/i.test(h));
      const defIdx = header.findIndex(h => /名词解释|定义|definition/i.test(h));
      const exIdx = header.findIndex(h => /例句|example/i.test(h));
      const terms = (data.slice(1) as string[][]).map(row => ({
        term: (termIdx >= 0 ? row[termIdx] : row[0]) ?? '',
        phonetic: '',
        termTranslation: (transIdx >= 0 ? row[transIdx] : '') || undefined,
        definitionEn: '',
        definitionCn: defIdx >= 0 ? row[defIdx] : (row[2] ?? ''),
        example: exIdx >= 0 ? row[exIdx] : (row[3] ?? ''),
        wrongDefinitions: [] as string[],
      })).filter(t => String(t.term).trim());
      return { terms };
    }
    default:
      return { terms: [] };
  }
}

/** 根据文件名推测格式 */
export function guessFormatFromFilename(name: string): ExportFormat | '' {
  const n = name.toLowerCase();
  if (n.endsWith('.json')) return 'json';
  if (n.endsWith('.csv')) return 'csv';
  if (n.endsWith('.txt')) return 'txt';
  if (n.endsWith('.md')) return 'md';
  if (n.endsWith('.xlsx') || n.endsWith('.xls')) return 'xlsx';
  if (n.endsWith('.doc') || n.endsWith('.docx')) return 'doc';
  return '';
}
