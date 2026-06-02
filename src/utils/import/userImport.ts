export interface ParsedImportUser {
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phoneNumber: string;
  schoolName: string;
  enterYear: string;
  cohort: string;
  gender: 0 | 1 | null;
}

export const USER_IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024;

type ImportField =
  | 'fullName'
  | 'email'
  | 'phoneNumber'
  | 'schoolName'
  | 'enterYear'
  | 'cohort'
  | 'gender';

const HEADER_ALIASES: Record<ImportField, string[]> = {
  fullName: ['ho ten', 'hoten', 'họ tên', 'name', 'full name', 'fullname'],
  email: ['email', 'e mail', 'mail', 'dia chi email', 'địa chỉ email'],
  phoneNumber: [
    'sdt',
    'sđt',
    'so dien thoai',
    'số điện thoại',
    'phone',
    'phone number',
    'phonenumber',
  ],
  schoolName: [
    'truong',
    'trường',
    'ten truong',
    'tên trường',
    'school',
    'school name',
    'schoolname',
  ],
  enterYear: ['nam vao doi', 'năm vào đội', 'enter year', 'enteryear', 'entry year', 'year'],
  cohort: ['khoa', 'khóa', 'ten khoa', 'tên khóa', 'cohort'],
  gender: ['gioi tinh', 'giới tính', 'gender', 'sex'],
};

const REQUIRED_IMPORT_FIELDS: ImportField[] = [
  'fullName',
  'email',
  'phoneNumber',
  'schoolName',
  'enterYear',
  'cohort',
  'gender',
];

const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  fullName: 'Họ tên',
  email: 'Email',
  phoneNumber: 'SĐT',
  schoolName: 'Trường',
  enterYear: 'Năm vào Đội',
  cohort: 'Khóa',
  gender: 'Giới tính',
};

export async function parseUserImportFile(file: File): Promise<ParsedImportUser[]> {
  if (file.size > USER_IMPORT_MAX_FILE_BYTES) {
    throw new Error(`File import tối đa ${formatBytes(USER_IMPORT_MAX_FILE_BYTES)}.`);
  }

  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseRows(parseCsv(await file.text()));
  }

  if (extension === 'xlsx') {
    return parseRows(await parseXlsx(file));
  }

  throw new Error('Vui lòng chọn file CSV hoặc XLSX.');
}

export function downloadUserImportSample(format: 'csv' | 'xlsx') {
  const link = document.createElement('a');

  link.href = `/samples/user-import-sample.${format}`;
  link.download = `vit-hub-user-import-sample.${format}`;
  document.body.append(link);
  link.click();
  link.remove();
}

function parseRows(rows: string[][]) {
  const nonEmptyRows = rows.filter((row) => row.some((cell) => cell.trim()));

  if (nonEmptyRows.length < 2) {
    throw new Error('File cần có dòng tiêu đề và ít nhất 1 dòng nhân sự.');
  }

  const headers = nonEmptyRows[0].map(normalizeHeader);
  const fieldIndexes = getFieldIndexes(headers);
  const missingFields = REQUIRED_IMPORT_FIELDS.filter((field) => fieldIndexes[field] === undefined);

  if (missingFields.length > 0) {
    throw new Error(
      `File thiếu cột bắt buộc: ${missingFields.map((field) => IMPORT_FIELD_LABELS[field]).join(', ')}.`,
    );
  }

  const parsedUsers = nonEmptyRows.slice(1).map((row, index) => {
    const fullName = readCell(row, fieldIndexes.fullName);
    const email = readCell(row, fieldIndexes.email).toLowerCase();
    const nameParts = splitFullName(fullName);

    if (!fullName) {
      throw new Error(`Dòng ${index + 2}: Họ tên không được để trống.`);
    }

    if (!isValidEmail(email)) {
      throw new Error(`Dòng ${index + 2}: Email không hợp lệ.`);
    }

    return {
      ...nameParts,
      email,
      phoneNumber: normalizePhoneNumber(readCell(row, fieldIndexes.phoneNumber)),
      schoolName: readCell(row, fieldIndexes.schoolName),
      enterYear: readCell(row, fieldIndexes.enterYear),
      cohort: readCell(row, fieldIndexes.cohort),
      gender: parseGender(readCell(row, fieldIndexes.gender)),
    };
  });

  const duplicateEmails = findDuplicateEmails(parsedUsers);

  if (duplicateEmails.length > 0) {
    throw new Error(`File có email bị trùng: ${duplicateEmails.join(', ')}.`);
  }

  return parsedUsers;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhoneNumber(value: string) {
  return value.replace(/\s+/g, '') || '-';
}

function findDuplicateEmails(users: ParsedImportUser[]) {
  const seenEmails = new Set<string>();
  const duplicateEmails = new Set<string>();

  for (const user of users) {
    if (seenEmails.has(user.email)) {
      duplicateEmails.add(user.email);
    }

    seenEmails.add(user.email);
  }

  return [...duplicateEmails];
}

function getFieldIndexes(headers: string[]) {
  const indexes: Partial<Record<ImportField, number>> = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [ImportField, string[]][]) {
    indexes[field] = headers.findIndex((header) =>
      aliases.some((alias) => header === normalizeHeader(alias)),
    );

    if (indexes[field] === -1) {
      indexes[field] = undefined;
    }
  }

  return indexes;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: '', middleName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: parts[0] };
  }

  return {
    firstName: parts[parts.length - 1],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[0],
  };
}

function parseGender(value: string): 0 | 1 | null {
  const normalized = normalizeHeader(value);

  if (['0', 'nu', 'nữ', 'female', 'f'].includes(normalized)) {
    return 0;
  }

  if (['1', 'nam', 'male', 'm'].includes(normalized)) {
    return 1;
  }

  return null;
}

function formatBytes(bytes: number) {
  const megabytes = bytes / 1024 / 1024;

  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}

function readCell(row: string[], index: number | undefined) {
  return index === undefined ? '' : (row[index] ?? '').trim();
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (isQuoted && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
    } else if (char === ',' && !isQuoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !isQuoted) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

async function parseXlsx(file: File) {
  const entries = await readZipEntries(await file.arrayBuffer());
  const sheetXml = entries.get('xl/worksheets/sheet1.xml');

  if (!sheetXml) {
    throw new Error('Không tìm thấy sheet đầu tiên trong file XLSX.');
  }

  const sharedStrings = parseSharedStrings(entries.get('xl/sharedStrings.xml') ?? '');
  const document = new DOMParser().parseFromString(sheetXml, 'application/xml');
  const rowElements = [...document.querySelectorAll('sheetData row')];

  return rowElements.map((rowElement) => {
    const cells: string[] = [];

    for (const cellElement of [...rowElement.querySelectorAll('c')]) {
      const cellRef = cellElement.getAttribute('r') ?? '';
      const columnIndex = getColumnIndex(cellRef);
      cells[columnIndex] = getXlsxCellValue(cellElement, sharedStrings);
    }

    return cells.map((cell) => cell ?? '');
  });
}

function parseSharedStrings(xml: string) {
  if (!xml) {
    return [];
  }

  const document = new DOMParser().parseFromString(xml, 'application/xml');
  return [...document.querySelectorAll('si')].map((item) => item.textContent ?? '');
}

function getXlsxCellValue(cellElement: Element, sharedStrings: string[]) {
  const type = cellElement.getAttribute('t');

  if (type === 's') {
    const sharedStringIndex = Number(cellElement.querySelector('v')?.textContent ?? -1);
    return sharedStrings[sharedStringIndex] ?? '';
  }

  if (type === 'inlineStr') {
    return cellElement.querySelector('is')?.textContent ?? '';
  }

  return cellElement.querySelector('v')?.textContent ?? '';
}

function getColumnIndex(cellRef: string) {
  const letters = cellRef.match(/[A-Z]+/)?.[0] ?? 'A';

  return [...letters].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function readZipEntries(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const entries = new Map<string, string>();
  const centralDirectoryOffset = findCentralDirectoryOffset(view);
  let offset = centralDirectoryOffset;

  while (view.getUint32(offset, true) === 0x02014b50) {
    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const fileName = decodeBytes(buffer, offset + 46, fileNameLength);
    const fileData = getLocalFileData(buffer, localHeaderOffset, compressedSize);

    if (fileName.endsWith('.xml')) {
      entries.set(fileName, await decodeZipData(fileData, compressionMethod));
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findCentralDirectoryOffset(view: DataView) {
  const minOffset = Math.max(0, view.byteLength - 65_557);

  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return view.getUint32(offset + 16, true);
    }
  }

  throw new Error('File XLSX không hợp lệ.');
}

function getLocalFileData(buffer: ArrayBuffer, localHeaderOffset: number, compressedSize: number) {
  const view = new DataView(buffer);

  if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
    throw new Error('File XLSX không hợp lệ.');
  }

  const fileNameLength = view.getUint16(localHeaderOffset + 26, true);
  const extraLength = view.getUint16(localHeaderOffset + 28, true);
  const dataOffset = localHeaderOffset + 30 + fileNameLength + extraLength;

  return buffer.slice(dataOffset, dataOffset + compressedSize);
}

async function decodeZipData(data: ArrayBuffer, compressionMethod: number) {
  if (compressionMethod === 0) {
    return new TextDecoder().decode(data);
  }

  if (compressionMethod !== 8 || typeof DecompressionStream === 'undefined') {
    throw new Error('Trình duyệt không hỗ trợ đọc định dạng nén của file XLSX này.');
  }

  const stream = new Blob([data])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}

function decodeBytes(buffer: ArrayBuffer, offset: number, length: number) {
  return new TextDecoder().decode(buffer.slice(offset, offset + length));
}
