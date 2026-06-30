// src/components/DailyReportView.jsx
import React, { useState, useEffect } from 'react';
import {
  Paper, Grid, Typography, Box, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { safeNumber, getOrderPrice, ceilHoursBetween } from '../utils/helpers';
import Timer from './Timer';

const DailyReportView = ({ selectedDate, basicPrice = 15, drinksPrice = 20 }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!selectedDate) {
      setLoading(false);
      return;
    }

    const fetchDayData = async () => {
      setLoading(true);
      try {
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);

        const q = query(
          collection(db, 'sessions'),
          where('startTime', '>=', start.toISOString()),
          where('startTime', '<=', end.toISOString())
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const finished = data.filter(s => s.finished);

        // دالة حساب الإيرادات
        const calcRevenue = (s) => {
          const hours = s.sessionType === 'take away' ? 0 : (s.hoursRounded || ceilHoursBetween(s.startTime, s.endTime));
          const pricePerHour = safeNumber(s.pricePerHour) || 
            (s.sessionType === 'drinks' ? drinksPrice : 
             s.sessionType === 'basic' ? basicPrice : 0);

          const hoursRevenue = hours * pricePerHour;
          const ordersRevenue = (s.orders || []).reduce((a, o) => a + getOrderPrice(o), 0);
          const total = safeNumber(s.totalCost) || (hoursRevenue + ordersRevenue);

          return { hours, hoursRevenue, drinksRevenue: ordersRevenue, total };
        };

        const basic = finished.filter(s => s.sessionType === 'basic');
        const drinks = finished.filter(s => s.sessionType === 'drinks');
        const takeaway = finished.filter(s => s.sessionType === 'take away');

        let totalHours = 0;
        let totalHoursRevenue = 0;
        let totalDrinksRevenue = 0;
        let totalRevenue = 0;

        const basicStats = { sessions: 0, hours: 0, hoursRevenue: 0, drinksRevenue: 0, total: 0 };
        const drinksStats = { sessions: 0, hours: 0, hoursRevenue: 0, drinksRevenue: 0, total: 0 };
        const takeawayStats = { sessions: 0, total: 0 };

        // حساب basic + drinks
        [...basic, ...drinks].forEach(s => {
          const { hours, hoursRevenue, drinksRevenue, total } = calcRevenue(s);
          totalHours += hours;
          totalHoursRevenue += hoursRevenue;
          totalDrinksRevenue += drinksRevenue;
          totalRevenue += total;

          if (s.sessionType === 'basic') {
            basicStats.sessions++;
            basicStats.hours += hours;
            basicStats.hoursRevenue += hoursRevenue;
            basicStats.drinksRevenue += drinksRevenue;
            basicStats.total += total;
          } else {
            drinksStats.sessions++;
            drinksStats.hours += hours;
            drinksStats.hoursRevenue += hoursRevenue;
            drinksStats.drinksRevenue += drinksRevenue;
            drinksStats.total += total;
          }
        });

        // حساب تيك أواي
        takeaway.forEach(s => {
          const ordersRevenue = (s.orders || []).reduce((a, o) => a + getOrderPrice(o), 0);
          takeawayStats.sessions++;
          takeawayStats.total += ordersRevenue;
          totalDrinksRevenue += ordersRevenue;
          totalRevenue += ordersRevenue;
        });

        // حساب عدد الساعات الكلي
        const totalHoursCount = totalHours;

        setStats({
          totalSessions: finished.length,
          totalRevenue,
          totalHoursRevenue,
          totalDrinksRevenue,
          totalHoursCount, // ← عدد الساعات الكلي

          basicSessions: basicStats.sessions,
          basicHours: basicStats.hours,
          basicHoursRevenue: basicStats.hoursRevenue,
          basicDrinksRevenue: basicStats.drinksRevenue,
          basicTotal: basicStats.total,

          drinksSessions: drinksStats.sessions,
          drinksHours: drinksStats.hours,
          drinksHoursRevenue: drinksStats.hoursRevenue,
          drinksDrinksRevenue: drinksStats.drinksRevenue,
          drinksTotal: drinksStats.total,

          takeawaySessions: takeawayStats.sessions,
          takeawayRevenue: takeawayStats.total,
        });

        setSessions(finished);
      } catch (err) {
        console.error('Error fetching day data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDayData();
  }, [selectedDate, basicPrice, drinksPrice]);

  if (!selectedDate) return null;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        لا توجد جلسات منتهية في هذا اليوم
      </Alert>
    );
  }

  return (
    <>
      {/* ملخص الإيرادات */}
     <Grid container spacing={3} mb={4}>
  {/* مذاكرة فقط */}
  <Grid item xs={12} md={3}>
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        textAlign: 'center', 
        bgcolor: '#e3f2fd', 
        height: '100%', 
        borderRadius: 3,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)' }
      }}
    >
      <Typography variant="h6" fontWeight="bold" color="primary" sx={{ mb: 1.5 }}>
        مذاكرة فقط
      </Typography>
      <Typography variant="h3" fontWeight="bold" color="text.primary">
        {stats.basicSessions}
      </Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>
        <strong>{stats.basicHours}</strong> ساعة
      </Typography>
      <Typography variant="body1" color="text.secondary">
        صافي الساعات: <strong>{stats.basicHoursRevenue.toFixed(2)} ج.م</strong>
      </Typography>
      {stats.basicDrinksRevenue > 0 && (
        <Typography variant="body1" color="success.main" sx={{ mt: 0.5 }}>
          المشروبات: <strong>{stats.basicDrinksRevenue.toFixed(2)} ج.م</strong>
        </Typography>
      )}
      <Box sx={{ mt: 2, pt: 1, borderTop: '2px solid #bbdefb' }}>
        <Typography variant="h5" fontWeight="bold" color="primary">
          {stats.basicTotal.toFixed(2)} ج.م
        </Typography>
      </Box>
    </Paper>
  </Grid>

  {/* مع مشروبات */}
  <Grid item xs={12} md={3}>
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        textAlign: 'center', 
        bgcolor:  '#e3f2fd', 
        height: '100%', 
        borderRadius: 3,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)' }
      }}
    >
      <Typography variant="h6" fontWeight="bold" color="secondary" sx={{ mb: 1.5 }}>
        مع مشروبات
      </Typography>
      <Typography variant="h3" fontWeight="bold" color="text.primary">
        {stats.drinksSessions}
      </Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>
        <strong>{stats.drinksHours}</strong> ساعة
      </Typography>
      <Typography variant="body1" color="text.secondary">
        الساعات: <strong>{stats.drinksHoursRevenue.toFixed(2)} ج.م</strong>
      </Typography>
      <Typography variant="body1" color="success.main" sx={{ mt: 0.5 }}>
        المشروبات: <strong>{stats.drinksDrinksRevenue.toFixed(2)} ج.م</strong>
      </Typography>
      <Box sx={{ mt: 2, pt: 1, borderTop: '2px solid  #bbdefb' }}>
        <Typography variant="h5" fontWeight="bold" color="secondary">
          {stats.drinksTotal.toFixed(2)} ج.م
        </Typography>
      </Box>
    </Paper>
  </Grid>

  {/* تيك أواي */}
  <Grid item xs={12} md={3}>
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        textAlign: 'center', 
        bgcolor: '#e8f5e9', 
        height: '100%', 
        borderRadius: 3,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)' }
      }}
    >
      <Typography variant="h6" fontWeight="bold" color="success" sx={{ mb: 1.5 }}>
        تيك أواي
      </Typography>
      <Typography variant="h3" fontWeight="bold" color="text.primary">
        {stats.takeawaySessions}
      </Typography>
      <Typography variant="body1" sx={{ mt: 1, height: 24 }}>&nbsp;</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
        إجمالي الطلبات
      </Typography>
      <Box sx={{ mt: 2, pt: 1, borderTop: '2px solid #c8e6c9' }}>
        <Typography variant="h5" fontWeight="bold" color="success">
          {stats.takeawayRevenue.toFixed(2)} ج.م
        </Typography>
      </Box>
    </Paper>
  </Grid>

  {/* الإجمالي */}
  <Grid item xs={12} md={3}>
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        textAlign: 'center', 
        bgcolor:  '#e8f5e9', 
        height: '100%', 
        borderRadius: 3,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)' }
      }}
    >
      <Typography variant="h6" fontWeight="bold" color="primary" sx={{ mb: 1.5 }}>
        الإجمالي
      </Typography>
      <Typography variant="h3" fontWeight="bold" color="primary">
        {stats.totalRevenue.toFixed(2)} 
      </Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>
        <strong>{stats.totalHoursCount}</strong> ساعة
      </Typography>
      <Typography variant="body1" color="text.secondary">
        صافي الساعات: <strong>{stats.totalHoursRevenue.toFixed(2)} ج.م</strong>
      </Typography>
      <Typography variant="body1" color="success.main" sx={{ mt: 0.5 }}>
        المشروبات: <strong>{stats.totalDrinksRevenue.toFixed(2)} ج.م</strong>
      </Typography>
      <Typography variant="body1" sx={{ mt: 0.5 }}>
        {stats.totalSessions} جلسة
      </Typography>
    </Paper>
  </Grid>
</Grid>

      {/* جدول الجلسات */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>الهاتف</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الطلبات</TableCell>
                <TableCell>البداية</TableCell>
                <TableCell>المدة</TableCell>
                <TableCell>التكلفة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((s) => {
                const { hours, hoursRevenue, drinksRevenue, total } = (() => {
                  const h = s.sessionType === 'take away' ? 0 : (s.hoursRounded || ceilHoursBetween(s.startTime, s.endTime));
                  const price = safeNumber(s.pricePerHour) || 
                    (s.sessionType === 'drinks' ? drinksPrice : 
                     s.sessionType === 'basic' ? basicPrice : 0);
                  const hr = h * price;
                  const or = (s.orders || []).reduce((a, o) => a + getOrderPrice(o), 0);
                  const t = safeNumber(s.totalCost) || (hr + or);
                  return { hours: h, hoursRevenue: hr, drinksRevenue: or, total: t };
                })();

                return (
                  <TableRow key={s.id}>
                    <TableCell>{s.fullName}</TableCell>
                    <TableCell>{s.phoneNumber}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          s.sessionType === 'drinks' ? 'مع مشروبات' :
                          s.sessionType === 'take away' ? 'تيك أواي' : 'مذاكرة فقط'
                        }
                        size="small"
                        color={
                          s.sessionType === 'drinks' ? 'secondary' :
                          s.sessionType === 'take away' ? 'success' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {(s.orders || []).map(o => `${getOrderPrice(o)}ج`).join(' + ') || '—'}
                    </TableCell>
                    <TableCell>{new Date(s.startTime).toLocaleTimeString('ar-EG')}</TableCell>
                    <TableCell>
                      <Timer startTime={s.startTime} endTime={s.endTime} finished />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {s.sessionType === 'take away' ? (
                        <Typography variant="body2" color="success.main">
                          طلبات: {drinksRevenue.toFixed(2)} ج.م
                        </Typography>
                      ) : (
                        <Box>
                          <Typography variant="body2">
                            {hours} ساعة × {s.sessionType === 'drinks' ? drinksPrice : basicPrice} = {hoursRevenue.toFixed(2)} ج.م
                          </Typography>
                          {drinksRevenue > 0 && (
                            <Typography variant="body2" color="success.main">
                              + مشروبات: {drinksRevenue.toFixed(2)} ج.م
                            </Typography>
                          )}
                          <Typography variant="body2" fontWeight="bold">
                            الإجمالي: {total.toFixed(2)} ج.م
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </>
  );
};

export default DailyReportView;