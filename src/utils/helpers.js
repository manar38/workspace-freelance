export const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const getOrderName = (o) => {
  if (!o) return '';
  if (typeof o === 'string') return o;
  return o.item || o.name || o.drinkName || '';
};

export const getOrderPrice = (o) => {
  if (!o) return 0;
  if (typeof o === 'string') return 0;
  return safeNumber(o.price || o.cost || 0);
};

export const ceilHoursBetween = (start, end) => {
  const ms = new Date(end) - new Date(start);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 3600000);
};

export const formatHMS = (start, end) => {
  const diff = (new Date(end) - new Date(start)) / 1000;
  if (!Number.isFinite(diff) || diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = Math.floor(diff % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export const formatCurrency = (amount) => {
  const n = safeNumber(amount);
  return `${n.toFixed(2)} ج`;
};
export const getSessionDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime || new Date());
  const diffMs = end - start;
  if (diffMs < 0) return "00:00:00";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};