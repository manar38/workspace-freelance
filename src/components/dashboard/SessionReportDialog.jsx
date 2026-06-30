import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Divider
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { formatCurrency } from '../../utils/helpers';

const SessionReportDialog = ({ open, session, onClose }) => {
  if (!session) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        تقرير الجلسة
        <IconButton onClick={onClose} sx={{ position: "absolute", left: 8, top: 8 }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box>
          <Typography>الاسم: {session.fullName}</Typography>
          <Typography>الهاتف: {session.phoneNumber}</Typography>
          <Typography>المدينة: {session.city}</Typography>
          <Typography>الصف: {session.studyYear}</Typography>
          <Typography>النوع: {session.sessionType}</Typography>
          <Divider sx={{ my: 1 }} />
          <Typography>الطلبات: {session._computed?.ordersSummary || "—"}</Typography>
          <Typography>
            وقت البداية: {new Date(session._computed.start).toLocaleString()}
          </Typography>
          <Typography>
            وقت النهاية: {session.finished ? new Date(session._computed.end).toLocaleString() : "—"}
          </Typography>
          <Typography>المدة: {session._computed.durationHours} ساعة</Typography>
          <Typography>سعر الساعة: {formatCurrency(session._computed.pricePerHour)}</Typography>
          <Typography>تكلفة الطلبات: {formatCurrency(session._computed.ordersTotal)}</Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="h6">إجمالي: {formatCurrency(session._computed.cost)}</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SessionReportDialog;