// داخل Dashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, TextField, InputAdornment, Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People, Schedule, AttachMoney, AccessTime,
  Search, CheckCircle, PendingActions
} from '@mui/icons-material';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import Navbar from '../components/Navbar';
import Timer from '../components/Timer';

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'sessions'), orderBy('startTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const sessionsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            startTime: new Date(data.startTime),
            endTime: data.endTime ? new Date(data.endTime) : null
          };
        });
        setSessions(sessionsData);
        setFilteredSessions(sessionsData);
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('حدث خطأ أثناء تحميل البيانات.');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const filtered = sessions.filter(session => {
      const matchText =
        session.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.city.toLowerCase().includes(searchQuery.toLowerCase());

      const sessionDate = new Date(session.startTime);
      const isAfterStart = fromDate ? sessionDate >= new Date(fromDate) : true;
      const isBeforeEnd = toDate ? sessionDate <= new Date(toDate + 'T23:59') : true;

      return matchText && isAfterStart && isBeforeEnd;
    });

    setFilteredSessions(filtered);
  }, [searchQuery, fromDate, toDate, sessions]);

  const calculateMetrics = () => {
  const startFilter = fromDate ? new Date(fromDate) : null;
  const endFilter = toDate ? new Date(toDate + 'T23:59') : null;

  const filteredByDate = sessions.filter(s => {
    const d = new Date(s.startTime);
    const afterStart = startFilter ? d >= startFilter : true;
    const beforeEnd = endFilter ? d <= endFilter : true;
    return afterStart && beforeEnd;
  });

  const active = filteredByDate.filter(s => !s.finished);

  const totalHours = filteredByDate.reduce((sum, s) => {
    if (s.finished && s.endTime) {
      return sum + (new Date(s.endTime) - new Date(s.startTime)) / 3600000;
    }
    return sum;
  }, 0);

  const totalRevenue = filteredByDate.reduce((sum, s) => sum + (s.totalCost || 0), 0);

  return {
    activeSessions: active.length,
    totalSessions: filteredByDate.length,
    monthlyHours: totalHours,
    monthlyRevenue: totalRevenue,
  };
};


  const formatCurrency = (amount) => `${amount.toFixed(2)} ج`;

  const metrics = calculateMetrics();

  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" dir="rtl">
        <Box py={2}>
          <Typography variant="h4" mb={3}><DashboardIcon sx={{ mr: 1 }} /> لوحة التحكم</Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Grid container spacing={3} alignItems="stretch" mb={4}>
            {[
              { icon: <PendingActions />, label: 'الجلسات النشطة', value: metrics.activeSessions },
              { icon: <People />, label: 'إجمالي الجلسات', value: metrics.totalSessions },
              { icon: <AccessTime />, label: 'ساعات هذا الشهر', value: metrics.monthlyHours.toFixed(1) },
              { icon: <AttachMoney />, label: 'إيرادات الشهر', value: formatCurrency(metrics.monthlyRevenue) },
            ].map((item, idx) => (
              <Grid item xs={12} sm={6} md={3} key={idx}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      {React.cloneElement(item.icon, { sx: { fontSize: 40, color: 'primary.main' } })}
                      <Box>
                        <Typography variant="h4">{item.value}</Typography>
                        <Typography color="text.secondary">{item.label}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Filters */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="ابحث بالاسم أو المدينة"
                  fullWidth
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField
                  label="من تاريخ"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField
                  label="إلى تاريخ"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Table */}
          <Paper>
            <Box p={3}>
              <Typography variant="h6" mb={2}>كل الجلسات</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الاسم</TableCell>
                      <TableCell>الهاتف</TableCell>
                      <TableCell>المدينة</TableCell>
                      <TableCell>الصف</TableCell>
                      <TableCell>البداية</TableCell>
                      <TableCell>المدة</TableCell>
                      <TableCell>التكلفة</TableCell>
                      <TableCell>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSessions.map(session => (
                      <TableRow key={session.id}>
                        <TableCell>{session.fullName}</TableCell>
                        <TableCell>{session.phoneNumber}</TableCell>
                        <TableCell>{session.city}</TableCell>
                        <TableCell>{session.studyYear}</TableCell>
                        <TableCell>
                          {new Date(session.startTime).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {session.finished
                            ? formatDuration(session.startTime, session.endTime)
                            : <Timer startTime={session.startTime} />
                          }
                        </TableCell>
                        <TableCell>
                          {session.finished
                            ? formatCurrency(session.totalCost || 0)
                            : formatCurrency(((new Date() - new Date(session.startTime)) / 3600000) * 20)}
                        </TableCell>
                        <TableCell>
                          {session.finished
                            ? <Chip label="منتهية" color="success" icon={<CheckCircle />} size="small" />
                            : <Chip label="نشطة" color="primary" icon={<Schedule />} size="small" />
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {filteredSessions.length === 0 && (
                <Typography align="center" mt={3} color="text.secondary">
                  لا توجد جلسات مطابقة للفلاتر.
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

const formatDuration = (start, end) => {
  const diff = (new Date(end) - new Date(start)) / 1000;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = Math.floor(diff % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default Dashboard;
