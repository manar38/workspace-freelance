// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import {
  Container, Paper, TextField, Button, Typography, Box, Alert,
  Grid, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip,
  Radio, RadioGroup, FormControlLabel, IconButton, Divider, List, ListItem, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Person, Phone, LocationOn, School, Close, Delete } from '@mui/icons-material';
import { db } from '../utils/firebase';
import {
  collection, addDoc, onSnapshot, updateDoc, doc, query, where, getDoc
} from 'firebase/firestore';
import Timer from '../components/Timer';
import Navbar from '../components/Navbar';
import { jsPDF } from 'jspdf';
import amiriFont from '../fonts/Amiri-Regular-normal.js';
import TakeawayOrders from "./takeaway.jsx";

// small helpers
const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const getOrderName = (o) => {
  if (!o) return '';
  if (typeof o === 'string') return o;
  return o.item || o.name || o.drinkName || '';
};
const getOrderPrice = (o) => {
  if (!o) return 0;
  if (typeof o === 'string') return 0;
  return safeNumber(o.price || o.cost || 0);
};
const ceilHoursBetween = (startIso, endIso) => {
  const ms = new Date(endIso) - new Date(startIso);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 3600000);
};

const Home = () => {
  const [formData, setFormData] = useState({ fullName: '', phoneNumber: '', city: '', studyYear: '' });
  const [sessionType, setSessionType] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderItem, setOrderItem] = useState('');
  const [orderPrice, setOrderPrice] = useState('');

  // تحميل الجلسات النشطة (realtime)
  useEffect(() => {
    const q = query(collection(db, 'sessions'), where('finished', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setActiveSessions(sessions);
    }, (err) => {
      console.error('Error fetching sessions:', err);
      setError('فشل تحميل الجلسات النشطة.');
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
        sessionType,
        orders: [],
        startTime: new Date().toISOString(),
        finished: false,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'sessions'), sessionData);
      setSuccess('تم بدء الجلسة بنجاح!');
      setFormData({ fullName: '', phoneNumber: '', city: '', studyYear: '' });
      setSessionType('basic');
    } catch (err) {
      setError('فشل في بدء الجلسة، حاول مرة أخرى.');
      console.error('Error adding session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = async (session) => {
    if (!session) return;

    let basicPrice = 0;
    let drinksPrice = 0;
    try {
      const pricingRef = doc(db, 'settings', 'pricing');
      const snap = await getDoc(pricingRef);
      if (snap.exists()) {
        const d = snap.data();
        basicPrice = safeNumber(d.basicPrice);
        drinksPrice = safeNumber(d.drinksPrice);
      }
    } catch (err) {
      console.error('Error fetching pricing:', err);
      setError('فشل جلب الأسعار، سيتم استخدام القيم الافتراضية.');
    }

    const now = new Date().toISOString();
    const start = new Date(session.startTime);
    const end = new Date(now);
    const durationHoursDecimal = (end - start) / (1000 * 60 * 60);
    const hoursRounded = ceilHoursBetween(session.startTime, now);
    const pricePerHour = session.sessionType === 'drinks' ? drinksPrice : basicPrice;
    const sessionCost = hoursRounded * pricePerHour;
    const ordersTotal = (session.orders || []).reduce((sum, o) => sum + getOrderPrice(o), 0);
    const totalCost = Math.round((sessionCost + ordersTotal) * 100) / 100;

    setSelectedSession({
      ...session,
      _computed: {
        endTime: now,
        duration: durationHoursDecimal.toFixed(2),
        hoursRounded,
        pricePerHour,
        sessionCost,
        ordersTotal,
        totalCost
      }
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSession(null);
  };

  const handleFinishSession = async (sessionId, session) => {
    if (!session) return;
    
    const endTime = new Date().toISOString();
    const start = new Date(session.startTime);
    const end = new Date(endTime);
    const durationHoursDecimal = (end - start) / (1000 * 60 * 60);
    const hoursRounded = ceilHoursBetween(session.startTime, endTime);

    let basicPrice = 0;
    let drinksPrice = 0;
    try {
      const pricingRef = doc(db, 'settings', 'pricing');
      const snap = await getDoc(pricingRef);
      if (snap.exists()) {
        const d = snap.data();
        basicPrice = safeNumber(d.basicPrice);
        drinksPrice = safeNumber(d.drinksPrice);
      }
    } catch (err) {
      console.error('Error fetching pricing:', err);
    }

    const pricePerHour = session.sessionType === 'drinks' ? drinksPrice : basicPrice;
    const totalOrders = (session.orders || []).reduce((sum, o) => sum + getOrderPrice(o), 0);
    const sessionCost = hoursRounded * pricePerHour;
    const totalCost = Math.round((sessionCost + totalOrders) * 100) / 100;

    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        endTime,
        finished: true,
        duration: durationHoursDecimal.toFixed(2),
        hoursRounded,
        pricePerHour,
        sessionCost,
        ordersTotal: totalOrders,
        totalCost
      });
    } catch (err) {
      console.error('Error updating finished session:', err);
      throw err;
    }

    return {
      endTime,
      duration: durationHoursDecimal.toFixed(2),
      hoursRounded,
      pricePerHour,
      sessionCost,
      ordersTotal: totalOrders,
      totalCost
    };
  };

  const handleFinishOnly = async () => {
    if (!selectedSession) return;
    try {
      await handleFinishSession(selectedSession.id, selectedSession);
      setSuccess('تم إنهاء الجلسة بنجاح!');
      handleCloseDialog();
    } catch (err) {
      setError('فشل إنهاء الجلسة.');
    }
  };

  const handleFinishAndPrint = async () => {
    if (!selectedSession) return;
    try {
      const result = await handleFinishSession(selectedSession.id, selectedSession);
      generateReport({ ...selectedSession, ...result });
      setSuccess('تم إنهاء الجلسة وطباعة التقرير بنجاح!');
      handleCloseDialog();
    } catch (err) {
      setError('فشل إنهاء الجلسة أو طباعة التقرير.');
    }
  };

  const generateReport = (session) => {
    const docPdf = new jsPDF();
    try {
      docPdf.addFileToVFS("Amiri-Regular.ttf", amiriFont);
      docPdf.addFont("Amiri-Regular.ttf", "Amiri", "normal");
      docPdf.setFont("Amiri");
    } catch (err) {
      console.warn('خط Amiri لم يُحمّل، سيتم استخدام الخط الافتراضي.', err);
    }

    docPdf.setFontSize(18);
    docPdf.text("تقرير الجلسة", 105, 20, { align: "center" });

    docPdf.setFontSize(12);
    let y = 38;

    const typeLabel = session.sessionType === 'drinks' ? "مع مشروبات" : session.sessionType === 'take away' ? "تيك أواي" : "مذاكرة فقط";
    const details = [
      ["الاسم:", session.fullName || "—"],
      ["الهاتف:", session.phoneNumber || "—"],
      ["المدينة:", session.city || "—"],
      ["الصف:", session.studyYear || "—"],
      ["نوع الجلسة:", typeLabel],
    ];

    details.forEach(([label, value]) => {
      docPdf.text(`${label} ${value}`, 190, y, { align: "right" });
      y += 8;
    });

    y += 4;
    docPdf.text("المشروبات / الطلبات:", 190, y, { align: "right" });
    y += 8;

    if (session.orders && session.orders.length > 0) {
      session.orders.forEach((o) => {
        const name = getOrderName(o) || "غير معروف";
        const price = getOrderPrice(o);
        docPdf.text(`- ${name} : ${price.toFixed ? price.toFixed(2) : price} ج.م`, 180, y, { align: "right" });
        y += 7;
      });
    } else {
      docPdf.text("—", 180, y, { align: "right" });
      y += 8;
    }

    y += 4;

    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : new Date();
    const hoursRounded = session.hoursRounded ?? ceilHoursBetween(session.startTime, session.endTime || new Date().toISOString());
    const pricePerHour = safeNumber(session.pricePerHour) || 0;
    const sessionCost = safeNumber(session.sessionCost) || hoursRounded * pricePerHour;
    const ordersTotal = safeNumber(session.ordersTotal) || (session.orders || []).reduce((s, o) => s + getOrderPrice(o), 0);
    const totalCost = safeNumber(session.totalCost) || Math.round((sessionCost + ordersTotal) * 100) / 100;

    const times = [
      ["البداية:", start.toLocaleString()],
      ["النهاية:", end ? end.toLocaleString() : "—"],
      ["المدة (مقربة):", `${hoursRounded} ${hoursRounded === 1 ? 'ساعة' : 'ساعات'}`],
      ["سعر الساعة:", `${pricePerHour.toFixed(2)} ج`],
      ["تكلفة الجلسة (ساعات × سعر):", `${sessionCost.toFixed(2)} ج`],
      ["تكلفة الطلبات:", `${ordersTotal.toFixed(2)} ج`],
      ["السعر الكلي:", `${totalCost.toFixed(2)} ج`],
    ];

    y += 4;
    times.forEach(([label, value]) => {
      docPdf.text(`${label} ${value}`, 190, y, { align: "right" });
      y += 8;
    });

    const filename = `تقرير_${session.fullName || 'session'}_${Date.now()}.pdf`;
    docPdf.save(filename);
  };

  // إضافة طلب جديد
  const handleAddOrder = async () => {
    if (!orderItem || !orderPrice || isNaN(orderPrice) || Number(orderPrice) <= 0) {
      setError('يرجى إدخال اسم الصنف وسعر صحيح.');
      return;
    }
    const newOrder = { item: orderItem, price: Number(orderPrice) };
    const updatedOrders = [...(selectedSession?.orders || []), newOrder];

    try {
      await updateDoc(doc(db, 'sessions', selectedSession.id), {
        orders: updatedOrders
      });
      setSelectedSession({ ...selectedSession, orders: updatedOrders });
      setOrderItem('');
      setOrderPrice('');
      setSuccess('تم إضافة الطلب بنجاح!');
    } catch (err) {
      console.error('Error adding order:', err);
      setError('فشل إضافة الطلب، حاول مرة أخرى.');
    }
  };

  // تعديل طلب موجود
  const handleEditOrder = async (index, field, value) => {
    if (!selectedSession) return;
    const updatedOrders = [...selectedSession.orders];
    const existing = updatedOrders[index] || {};
    updatedOrders[index] = { ...existing, [field]: field === 'price' ? Number(value) : value };
    
    try {
      await updateDoc(doc(db, 'sessions', selectedSession.id), {
        orders: updatedOrders
      });
      setSelectedSession({ ...selectedSession, orders: updatedOrders });
      setSuccess('تم تعديل الطلب بنجاح!');
    } catch (err) {
      console.error('Error editing order:', err);
      setError('فشل تعديل الطلب، حاول مرة أخرى.');
    }
  };

  // حذف طلب
  const handleDeleteOrder = async (index) => {
    if (!selectedSession) return;
    const updatedOrders = selectedSession.orders.filter((_, i) => i !== index);
    try {
      await updateDoc(doc(db, 'sessions', selectedSession.id), {
        orders: updatedOrders
      });
      setSelectedSession({ ...selectedSession, orders: updatedOrders });
      setSuccess('تم حذف الطلب بنجاح!');
    } catch (err) {
      console.error('Error deleting order:', err);
      setError('فشل حذف الطلب، حاول مرة أخرى.');
    }
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
        <Timer startTime={params.row.startTime} finished={params.row.finished} />
      )
    },
    {
      field: 'orders',
      headerName: 'الطلبات',
      width: 200,
      renderCell: (params) => (
        <Tooltip
          title={
            params.row.orders && params.row.orders.length > 0
              ? params.row.orders.map(o => `${getOrderName(o)}: ${getOrderPrice(o)} ج.م`).join(' / ')
              : "لا يوجد طلبات"
          }
        >
          <Button
            variant="outlined"
            onClick={() => {
              setSelectedSession(params.row);
              setOrderDialogOpen(true);
              setError('');
              setSuccess('');
            }}
            disabled={params.row.finished}
          >
            إضافة / عرض طلب
          </Button>
        </Tooltip>
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

                <Typography sx={{ mt: 2 }}>نوع الجلسة:</Typography>
                <RadioGroup row value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
                  <FormControlLabel value="basic" control={<Radio />} label="بدون مشروبات" />
                  <FormControlLabel value="drinks" control={<Radio />} label="مع مشروبات" />
                </RadioGroup>

                <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 3, mb: 2 }}>
                  {loading ? 'جاري بدء الجلسة...' : 'بدء الجلسة'}
                </Button>
              </Box>
            </Paper>
          </Grid>
            
          <Grid item xs={12} md={6}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={12}>
                <Card elevation={3}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>الجلسات النشطة حاليًا</Typography>
                    <Typography variant="h2" color="#ee9217" gutterBottom>{activeSessions.length}</Typography>
                    <Typography variant="body2" color="text.secondary">عدد الطلاب داخل الجلسة الآن</Typography>
                  </CardContent>
                </Card>
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          هل تريد إنهاء الجلسة؟
          <IconButton aria-label="close" onClick={handleCloseDialog} sx={{ position: 'absolute', left: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography>تقرير الجلسة (بناءً على الوقت الحالي):</Typography>
          {selectedSession && selectedSession._computed ? (
            <Box>
              <Typography>الاسم: {selectedSession.fullName || '—'}</Typography>
              <Typography>الهاتف: {selectedSession.phoneNumber || '—'}</Typography>
              <Typography>المدينة: {selectedSession.city || '—'}</Typography>
              <Typography>الصف: {selectedSession.studyYear || '—'}</Typography>
              <Typography>النوع: {selectedSession.sessionType === 'drinks' ? 'مع مشروبات' : selectedSession.sessionType === 'take away' ? 'تيك أواي' : 'بدون مشروبات'}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography>الطلبات: {(selectedSession.orders || []).map(o => `${getOrderName(o)} (${getOrderPrice(o)}ج)`).join(', ') || '—'}</Typography>
              <Typography>وقت البداية: {new Date(selectedSession.startTime).toLocaleString()}</Typography>
              <Typography>وقت النهاية المقترح: {selectedSession._computed.endTime ? new Date(selectedSession._computed.endTime).toLocaleString() : '—'}</Typography>
              <Typography>المدة (مقربة): {selectedSession._computed.hoursRounded} ساعة</Typography>
              <Typography>سعر الساعة: {selectedSession._computed.pricePerHour.toFixed(2)} ج</Typography>
              <Typography>تكلفة الجلسة: {selectedSession._computed.sessionCost.toFixed(2)} ج</Typography>
              <Typography>تكلفة الطلبات: {selectedSession._computed.ordersTotal.toFixed(2)} ج</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6">إجمالي: {selectedSession._computed.totalCost.toFixed(2)} ج</Typography>
            </Box>
          ) : (
            <Typography color="error">خطأ: لا توجد بيانات للجلسة</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
          <Button onClick={handleFinishOnly} color="error" disabled={!selectedSession}>إنهاء فقط</Button>
          <Button onClick={handleFinishAndPrint} variant="contained" color="primary" disabled={!selectedSession}>إنهاء وطباعة التقرير</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog إدارة الطلبات */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          إدارة الطلبات
          <IconButton aria-label="close" onClick={() => setOrderDialogOpen(false)} sx={{ position: 'absolute', left: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <Typography variant="subtitle1" gutterBottom>إضافة طلب جديد</Typography>
          <TextField
            fullWidth
            label="اسم الصنف"
            value={orderItem}
            onChange={(e) => setOrderItem(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="السعر (ج.م)"
            type="number"
            value={orderPrice}
            onChange={(e) => setOrderPrice(e.target.value)}
            margin="normal"
            required
            inputProps={{ min: 0, step: 0.01 }}
          />
          <Button
            onClick={handleAddOrder}
            variant="contained"
            color="primary"
            sx={{ mt: 2, mb: 3 }}
            disabled={!orderItem || !orderPrice || isNaN(orderPrice) || Number(orderPrice) <= 0}
          >
            إضافة الطلب
          </Button>

          <Divider />
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>الطلبات الحالية</Typography>
          {selectedSession?.orders?.length > 0 ? (
            <List dense>
              {selectedSession.orders.map((order, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                          value={getOrderName(order)}
                          onChange={(e) => handleEditOrder(index, 'item', e.target.value)}
                          size="small"
                          sx={{ mr: 2, width: '60%' }}
                        />
                        <TextField
                          type="number"
                          value={getOrderPrice(order)}
                          onChange={(e) => handleEditOrder(index, 'price', e.target.value)}
                          size="small"
                          sx={{ width: '30%' }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteOrder(index)}
                    >
                      <Delete color="error" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">لا يوجد طلبات بعد</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)} color="primary">إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Home;