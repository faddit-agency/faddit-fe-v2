const pad2 = (value: number) => String(value).padStart(2, '0');

export const formatKoreanDateTime = (
  value?: string | number | Date | null,
  fallback = '-',
): string => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour24 = date.getHours();
  const meridiem = hour24 < 12 ? '오전' : '오후';
  const hour12Raw = hour24 % 12;
  const hour12 = pad2(hour12Raw === 0 ? 12 : hour12Raw);
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());

  return `${year}-${month}-${day} ${meridiem} ${hour12}시 ${minute}분 ${second}초`;
};
