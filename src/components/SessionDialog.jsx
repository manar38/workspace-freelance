import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider, IconButton
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { safeNumber, getOrderName, getOrderPrice, ceilHoursBetween, getSessionDuration } from '../utils/helpers';

const SessionDialog = ({ open, session, onClose, onSessionFinished, onError }) => {
  const [pricing, setPricing] = useState({ basicPrice: 0, drinksPrice: 0 });
  const [loading, setLoading] = useState(false);

  // تحميل الأسعار
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const pricingRef = doc(db, 'settings', 'pricing');
        const snap = await getDoc(pricingRef);
        if (snap.exists()) {
          const data = snap.data();
          setPricing({
            basicPrice: safeNumber(data.basicPrice),
            drinksPrice: safeNumber(data.drinksPrice)
          });
        }
      } catch (err) {
        console.error('Error fetching pricing:', err);
      }
    };

    if (open && session) {
      fetchPricing();
    }
  }, [open, session]);

  if (!session) return null;

  // حساب تكلفة الجلسة
  const calculateSessionCost = () => {
    const now = new Date();
    const endTime = session.endTime ? new Date(session.endTime) : now;
    const hoursRounded = session.hoursRounded || ceilHoursBetween(session.startTime, endTime);
    
    const pricePerHour = session.sessionType === 'drinks' ? pricing.drinksPrice : 
                        session.sessionType === 'take away' ? 0 : pricing.basicPrice;
    
    const ordersTotal = (session.orders || []).reduce((sum, o) => sum + getOrderPrice(o), 0);
    const sessionCost = hoursRounded * pricePerHour;
    const totalCost = Math.round((sessionCost + ordersTotal) * 100) / 100;

    return {
      endTime: endTime.toISOString(),
      duration: getSessionDuration(session.startTime, endTime),
      hoursRounded,
      pricePerHour,
      sessionCost,
      ordersTotal,
      totalCost
    };
  };

  const computedData = calculateSessionCost();

  const handleFinishSession = async (printReport = false) => {
    if (!session) return;

    setLoading(true);
    try {
      const sessionData = {
        endTime: computedData.endTime,
        finished: true,
        duration: computedData.duration,
        hoursRounded: computedData.hoursRounded,
        pricePerHour: computedData.pricePerHour,
        sessionCost: computedData.sessionCost,
        ordersTotal: computedData.ordersTotal,
        totalCost: computedData.totalCost
      };

      await updateDoc(doc(db, 'sessions', session.id), sessionData);

      if (printReport) {
        // هنا هتضيفي دالة طباعة التقرير لو محتاجينها
        console.log('Print report for:', session);
      }

      onSessionFinished();
    } catch (err) {
      console.error('Error finishing session:', err);
      onError('فشل إنهاء الجلسة.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOnly = () => {
    handleFinishSession(false);
  };

  const handleFinishAndPrint = () => {
    handleFinishSession(true);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        إنهاء الجلسة
        <IconButton aria-label="close" onClick={onClose} sx={{ position: 'absolute', left: 8, top: 8 }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" gutterBottom>تقرير الجلسة</Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography><strong>الاسم:</strong> {session.fullName || '—'}</Typography>
          <Typography><strong>الهاتف:</strong> {session.phoneNumber || '—'}</Typography>
          <Typography><strong>المدينة:</strong> {session.city || '—'}</Typography>
          <Typography><strong>الصف:</strong> {session.studyYear || '—'}</Typography>
          <Typography><strong>نوع الجلسة:</strong> {
            session.sessionType === 'drinks' ? 'مع مشروبات' : 
            session.sessionType === 'take away' ? 'تيك أواي' : 'بدون مشروبات'
          }</Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ mb: 2 }}>
          <Typography><strong>الطلبات:</strong> {
            (session.orders || []).map(o => `${getOrderName(o)} (${getOrderPrice(o)}ج)`).join(', ') || '—'
          }</Typography>
          <Typography><strong>وقت البداية:</strong> {new Date(session.startTime).toLocaleString()}</Typography>
          <Typography><strong>وقت النهاية:</strong> {new Date(computedData.endTime).toLocaleString()}</Typography>
          <Typography><strong>المدة (مقربة):</strong> {computedData.hoursRounded} ساعة</Typography>
          <Typography><strong>سعر الساعة:</strong> {computedData.pricePerHour.toFixed(2)} ج</Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ mb: 2 }}>
          <Typography><strong>تكلفة الجلسة:</strong> {computedData.sessionCost.toFixed(2)} ج</Typography>
          <Typography><strong>تكلفة الطلبات:</strong> {computedData.ordersTotal.toFixed(2)} ج</Typography>
          <Typography variant="h6" color="primary">
            <strong>الإجمالي:</strong> {computedData.totalCost.toFixed(2)} ج
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Button 
          onClick={handleFinishOnly} 
          color="primary" 
          variant="outlined"
          disabled={loading}
        >
          إنهاء فقط
        </Button>
        <Button 
          onClick={handleFinishAndPrint} 
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          {loading ? 'جاري المعالجة...' : 'إنهاء وطباعة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionDialog;