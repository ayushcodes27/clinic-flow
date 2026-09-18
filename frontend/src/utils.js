// Common utility functions for formatting and privacy

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatTime12h = (time24) => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${period}`;
};

export const formatIndianDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  return `${day} ${month}`;
};

export const formatDateTime = (dateStr, timeStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = MONTHS[d.getMonth()];
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${day} ${month}, ${hour12}:${m} ${period}`;
  }
  const formattedDate = formatIndianDate(dateStr);
  if (timeStr) {
    return `${formattedDate}, ${formatTime12h(timeStr)}`;
  }
  return formattedDate;
};

export const maskPatientName = (fullName) => {
  if (!fullName) return 'Patient';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
};

export const STATUS_LABELS = {
  ALL: 'All',
  NO_SHOW: 'No-shows',
  BOOKED: 'Booked',
  CHECKED_IN: 'Checked in',
  WAITING: 'Waiting',
  IN_CONSULTATION: 'In consultation',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};
