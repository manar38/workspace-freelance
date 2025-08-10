
import React, { useState, useEffect } from 'react';
import {
  Container, Paper, TextField, Button, Typography, Box, Alert,
  Grid, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Person, Phone, LocationOn, School } from '@mui/icons-material';
import { db } from '../utils/firebase';
import { collection, addDoc, onSnapshot, updateDoc, doc, query, where } from 'firebase/firestore';
import Timer from '../components/Timer';
import Navbar from '../components/Navbar';
import { jsPDF } from 'jspdf';
import amiriFont from '../fonts/Amiri-Regular-normal.js'; // ملف الخط العربي

const Home = () => {
  const [formData, setFormData] = useState({ fullName: '', phoneNumber: '', city: '', studyYear: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'sessions'), where('finished', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveSessions(sessions);
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const sessionData = {
        ...formData,
        startTime: new Date().toISOString(),
        finished: false,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'sessions'), sessionData);
      setSuccess('تم بدء الجلسة بنجاح!');
      setFormData({ fullName: '', phoneNumber: '', city: '', studyYear: '' });
    } catch (error) {
      setError('فشل في بدء الجلسة، حاول مرة أخرى.');
      console.error('Error adding session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (session) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSession(null);
  };

  const handleFinishSession = async (sessionId, startTime) => {
    const endTime = new Date().toISOString();
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationHours = (end - start) / (1000 * 60 * 60);
    const totalCost = Math.round(durationHours * 20 * 100) / 100;

    await updateDoc(doc(db, 'sessions', sessionId), {
      endTime,
      finished: true,
      duration: durationHours.toFixed(2),
      totalCost
    });
  };

  const handleFinishOnly = async () => {
    await handleFinishSession(selectedSession.id, selectedSession.startTime);
    setSuccess('تم إنهاء الجلسة بنجاح!');
    handleCloseDialog();
  };

  const handleFinishAndPrint = async () => {
    const now = new Date();
    const endTime = now.toISOString();
    const durationHours = ((now - new Date(selectedSession.startTime)) / 3600000).toFixed(2);
    const totalCost = Math.round(durationHours * 20 * 100) / 100;

    await handleFinishSession(selectedSession.id, selectedSession.startTime);
    generateReport({
      ...selectedSession,
      endTime,
      duration: durationHours,
      totalCost
    });
    setSuccess('تم إنهاء الجلسة وطباعة التقرير بنجاح!');
    handleCloseDialog();
  };

  const generateReport = (session) => {
    const doc = new jsPDF();

    // إضافة الخط العربي
    doc.addFileToVFS("Amiri-Regular.ttf", amiriFont);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    doc.setFont("Amiri");

    doc.setFontSize(18);
    doc.text("تقرير الجلسة", 105, 20, { align: "center" });

    doc.setFontSize(12);
    let y = 40;

    const data = [
      ["الاسم الكامل:", session.fullName],
      ["رقم الهاتف:", session.phoneNumber],
      ["المدينة:", session.city],
      ["السنة الدراسية:", session.studyYear],
      ["وقت البدء:", new Date(session.startTime).toLocaleString()],
      ["مدة الجلسة:", `${session.duration} ساعة`],
      ["السعر:", `${session.totalCost} ج.م`],
    ];

    // الكتابة بدعم RTL وبدون عكس يدوي
    data.forEach(([label, value]) => {
      doc.text(`${label} ${value}`, 190, y, { align: "right" });
      y += 10;
    });

    doc.save(`تقرير_${session.fullName}.pdf`);
  };

  const columns = [
    { field: 'fullName', headerName: 'الاسم الكامل', width: 200 },
    { field: 'phoneNumber', headerName: 'رقم الهاتف', width: 150 },
    { field: 'city', headerName: 'المدينة', width: 120 },
    { field: 'studyYear', headerName: 'السنة الدراسية', width: 120 },
    {
      field: 'duration',
      headerName: 'المدة',
      width: 120,
      renderCell: (params) => (
        <Timer startTime={params.row.startTime} finished={params.row.finished} />
      )
    },
    {
      field: 'actions',
      headerName: 'الإجراء',
      width: 160,
      renderCell: (params) => (
        <Button
          variant="outlined"
          onClick={() => handleOpenDialog(params.row)}
          disabled={params.row.finished}
        >
          إنهاء
        </Button>
      )
    }
  ];

  return (
    <Box dir="rtl">
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>بدء جلسة طالب جديد</Typography>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                <TextField fullWidth name="fullName" label="الاسم الكامل" value={formData.fullName} onChange={handleInputChange} margin="normal" required InputProps={{ startAdornment: <Person sx={{ mr: 1, color: '#ee9217' }} /> }} />
                <TextField fullWidth name="phoneNumber" label="رقم الهاتف" value={formData.phoneNumber} onChange={handleInputChange} margin="normal" required InputProps={{ startAdornment: <Phone sx={{ mr: 1, color: '#ee9217' }} /> }} />
                <TextField fullWidth name="city" label="البلد" value={formData.city} onChange={handleInputChange} margin="normal" required InputProps={{ startAdornment: <LocationOn sx={{ mr: 1, color: '#ee9217' }} /> }} />
                <TextField fullWidth name="studyYear" label="السنة الدراسية" value={formData.studyYear} onChange={handleInputChange} margin="normal" required InputProps={{ startAdornment: <School sx={{ mr: 1, color: '#ee9217' }} /> }} />
                <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 3, mb: 2 }}>{loading ? 'جاري بدء الجلسة...' : 'بدء الجلسة'}</Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>الجلسات النشطة حاليًا</Typography>
                <Typography variant="h2" color="#ee9217" gutterBottom>{activeSessions.length}</Typography>
                <Typography variant="body2" color="text.secondary">عدد الطلاب داخل الجلسة الآن</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>الجلسات الحالية</Typography>
              <Box sx={{ height: 400, width: '100%' }}>
                <DataGrid
                  rows={activeSessions}
                  columns={columns}
                  pageSize={5}
                  rowsPerPageOptions={[5, 10, 20]}
                  disableSelectionOnClick
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>هل تريد إنهاء الجلسة؟</DialogTitle>
        <DialogContent>
          <Typography>اختر طريقة الإنهاء المطلوبة:</Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
          <Button onClick={handleFinishOnly} color="error">إنهاء فقط</Button>
          <Button onClick={handleFinishAndPrint} variant="contained" color="primary">إنهاء وطباعة التقرير</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Home;
