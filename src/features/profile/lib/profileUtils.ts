export function getFullName(lastName: string, middleName: string, firstName: string) {
  return [lastName, middleName, firstName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

export function getGenderLabel(gender: 0 | 1 | null) {
  if (gender === 0) {
    return 'Nữ';
  }

  if (gender === 1) {
    return 'Nam';
  }

  return 'Khác';
}
