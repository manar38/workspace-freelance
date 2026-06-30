import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Tooltip, IconButton, Typography, Paper, Checkbox, Box
} from '@mui/material';
import {
  CheckCircle, Schedule, LocalCafe, Visibility, Delete,
  SelectAll, Deselect
} from '@mui/icons-material';
import Timer from '../Timer';
import { 
  formatCurrency, 
  getOrderName, 
  getOrderPrice, 
  ceilHoursBetween, 
  safeNumber, 
  formatHMS 
} from '../../utils/helpers';

const SessionsTable = ({ 
  sessions = [], 
  pricing, 
  onOpenReport, 
  onConfirmDelete,
  filter = { name: '', date: '', type: '' },
  selectedSessions = [],
  onSessionSelect,
  onSelectAll,
  onDeselectAll
}) => {
  const { basicPrice = 0, drinksPrice = 0 } = pricing || {};

  // دالة عرض الطلبات بأمان تام
  const renderOrdersInline = (orders) => {
    if (!Array.isArray(orders) || orders.length === 0) return '—';

    return orders
      .map((o) => {
        if (!o) return null; // تجنب null/undefined
        if (typeof o === 'string') return o;

        const name = getOrderName(o);
        const price = getOrderPrice(o);

        if (!name) return null; // تجنب أسماء فارغة

        return price > 0 ? `${name} (${price}ج)` : name;
      })
      .filter(Boolean) // إزالة null
      .join(', ') || '—';
  };

  // فلترة الجلسات
  const filteredSessions = sessions.filter((s) => {
    if (!s) return false;

    const matchesName = !filter.name || 
      (s.fullName || '').toLowerCase().includes(filter.name.toLowerCase());

    const matchesDate = !filter.date || 
      new Date(s.startTime).toISOString().split('T')[0] === filter.date;

    const matchesType = !filter.type || s.sessionType === filter.type;

    return matchesName && matchesDate && matchesType;
  });

  // حالة التحديد
  const allSelected = filteredSessions.length > 0 && 
    filteredSessions.every(s => selectedSessions.includes(s.id));

  const someSelected = filteredSessions.some(s => selectedSessions.includes(s.id));

  const handleSelectAll = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll(filteredSessions.map(s => s.id));
    }
  };

  const handleSessionSelect = (sessionId, checked) => {
    onSessionSelect(sessionId, checked);
  };

  return (
    <TableContainer component={Paper} elevation={2}>
      {/* شريط التحكم في التحديد */}
      {filteredSessions.length > 0 && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                indeterminate={someSelected && !allSelected}
                checked={allSelected}
                onChange={handleSelectAll}
                color="primary"
              />
              <Typography variant="body2">
                {selectedSessions.length} / {filteredSessions.length} محددة
              </Typography>
            </Box>

            {selectedSessions.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                <Tooltip title="إلغاء التحديد">
                  <IconButton size="small" onClick={onDeselectAll}>
                    <Deselect />
                  </IconButton>
                </Tooltip>
                <Typography variant="body2" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                  {selectedSessions.length} جلسة محددة
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={someSelected && !allSelected}
                checked={allSelected}
                onChange={handleSelectAll}
                color="primary"
              />
            </TableCell>
            <TableCell>الاسم</TableCell>
            <TableCell>الهاتف</TableCell>
            <TableCell>المدينة</TableCell>
            <TableCell>الصف</TableCell>
            <TableCell>نوع الجلسة</TableCell>
            <TableCell>المشروبات</TableCell>
            <TableCell>البداية</TableCell>
            <TableCell>المدة</TableCell>
            <TableCell>التكلفة</TableCell>
            <TableCell>الحالة</TableCell>
            <TableCell>إجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredSessions.map((s) => {
            if (!s) return null;

            const start = new Date(s.startTime);
            const end = s.endTime ? new Date(s.endTime) : new Date();
            const durationHours = s.sessionType === "take away" 
              ? 0 
              : (s.hoursRounded || ceilHoursBetween(start, end));

            const pricePerHour = safeNumber(s.pricePerHour) || 
              (s.sessionType === "drinks" ? drinksPrice : 
               s.sessionType === "take away" ? 0 : basicPrice);

            const ordersTotal = safeNumber(s.ordersTotal) || 
              (Array.isArray(s.orders) ? s.orders.reduce((acc, o) => acc + getOrderPrice(o), 0) : 0);

            const cost = safeNumber(s.totalCost) || (durationHours * pricePerHour + ordersTotal);
            const isSelected = selectedSessions.includes(s.id);

            return (
              <TableRow 
                key={s.id} 
                selected={isSelected}
                hover
                sx={{ 
                  bgcolor: isSelected ? 'action.selected' : 'inherit',
                  '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' }
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => handleSessionSelect(s.id, e.target.checked)}
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={isSelected ? "bold" : "normal"}>
                    {s.fullName || '—'}
                  </Typography>
                </TableCell>
                <TableCell>{s.phoneNumber || '—'}</TableCell>
                <TableCell>{s.city || '—'}</TableCell>
                <TableCell>{s.studyYear || '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={
                      s.sessionType === "drinks" ? "مع مشروبات" :
                      s.sessionType === "take away" ? "تيك أواي" : "مذاكرة فقط"
                    }
                    color={
                      s.sessionType === "drinks" ? "secondary" :
                      s.sessionType === "take away" ? "success" : "default"
                    }
                    icon={<LocalCafe />}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {renderOrdersInline(s.orders)}
                  </Typography>
                </TableCell>
                <TableCell>{start.toLocaleString('ar-EG')}</TableCell>
                <TableCell>
                  {s.finished ? (
                    <Typography variant="body2">{formatHMS(s.startTime, s.endTime)}</Typography>
                  ) : (
                    <Timer startTime={s.startTime} />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary">
                    {formatCurrency(cost)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {s.finished ? (
                    <Chip label="منتهية" color="success" icon={<CheckCircle />} size="small" />
                  ) : (
                    <Chip label="نشطة" color="primary" icon={<Schedule />} size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="عرض التقرير">
                      <IconButton size="small" onClick={() => onOpenReport(s)} color="primary">
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small" color="error" onClick={() => onConfirmDelete(s)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}

          {filteredSessions.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  لا توجد جلسات تطابق معايير البحث
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SessionsTable;