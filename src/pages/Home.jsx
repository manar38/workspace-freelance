import React, { useState, useEffect } from 'react';
import {
  Container, Paper, TextField, Button, Typography, Box, Alert, // ← تأكدي من وجود Button هنا
  Grid, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip,
  Radio, RadioGroup, FormControlLabel, IconButton, Divider, List, ListItem, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { db } from '../utils/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Timer from '../components/Timer';
import Navbar from '../components/Navbar';
import ClientForm from '../components/home/ClientForm.jsx';
import ActiveSessionsCard from '../components/home/ActiveSessionCard';
import TakeawayOrders from "../components/home/TakeawayOrders.jsx";
import SessionDialog from '../components/SessionDialog';
import OrdersDialog from '../components/OrdersDialog';
import { getOrderName, getOrderPrice } from '../utils/helpers';

const Home = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);


  // تحميل الجلسات النشطة (realtime)
  useEffect(() => {
    const q = query(collection(db, 'sessions'), where('finished', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(docSnap => ({ 
        id: docSnap.id, 
        ...docSnap.data() 
      }));
      setActiveSessions(sessions);
    }, (err) => {
      console.error('Error fetching sessions:', err);
      setError('فشل تحميل الجلسات النشطة.');
    });
    return () => unsubscribe();
  }, []);

  const handleOpenDialog = (session) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSession(null);
  };

  const handleOpenOrders = (session) => {
    setSelectedSession(session);
    setOrderDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSessionFinished = () => {
    setSuccess('تم إنهاء الجلسة بنجاح!');
    handleCloseDialog();
  };

  // Grid columns
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
    <Timer 
      startTime={params.row.startTime}
      finished={params.row.finished}
      endTime={params.row.endTime}
    />
  )
},
    {
      field: 'orders',
      headerName: 'الطلبات',
      width: 200,
      renderCell: (params) => (
        <Button
          variant="outlined"
          onClick={() => handleOpenOrders(params.row)}
          disabled={params.row.finished}
        >
          إضافة / عرض طلب
        </Button>
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
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ClientForm 
              onError={setError}
              onSuccess={setSuccess}
            />
          </Grid>
            
          <Grid item xs={12} md={6}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={12}>
                <ActiveSessionsCard count={activeSessions.length} />
              </Grid>

              <Grid item xs={12} md={12}>
                <TakeawayOrders />
              </Grid>
            </Grid>
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

      {/* Dialog إنهاء الجلسة */}
      <SessionDialog 
        open={dialogOpen}
        session={selectedSession}
        onClose={handleCloseDialog}
        onSessionFinished={handleSessionFinished}
        onError={setError}
      />

      {/* Dialog إدارة الطلبات */}
      <OrdersDialog
        open={orderDialogOpen}
        session={selectedSession}
        onClose={() => setOrderDialogOpen(false)}
        onError={setError}
        onSuccess={setSuccess}
        onUpdate={(updatedSession) => setSelectedSession(updatedSession)}
      />
    </Box>
  );
};

export default Home;