// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import {
  Container, Paper, TextField, Button, Typography, Box, Alert,
  Grid, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip,
  Radio, RadioGroup, FormControlLabel, IconButton
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Person, Phone, LocationOn, School, Close } from '@mui/icons-material';
import { db } from '../utils/firebase';
import {
  collection, addDoc, onSnapshot, updateDoc, doc, query, where, getDoc
} from 'firebase/firestore';
import Timer from '../components/Timer';
import Navbar from '../components/Navbar';
import { jsPDF } from 'jspdf';
import amiriFont from '../fonts/Amiri-Regular-normal.js'; // ملف الخط العربي
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
  const [sessionType, setSessionType] = useState('basic'); // basic = بدون مشروبات, drinks = مع مشروبات
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Dialog للطلبات
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderItem, setOrderItem] = useState('');
  const [orderPrice, setOrderPrice] = useState('');

  // نحمّل الجلسات النشطة (realtime)
  useEffect(() => {
    const q = query(collection(db, 'sessions'), where('finished', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
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
        sessionType, // basic or drinks
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

  const handleOpenDialog = (session) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSession(null);
  };

  // ======== تعديل هنا: حساب التكلفة مع استدعاء السعر من Firestore ========
  const handleFinishSession = async (sessionId, session) => {
    // نأخذ وقت النهاية الآن
    const endTime = new Date().toISOString();
    const start = new Date(session.startTime);
    const end = new Date(endTime);

    // مدة فعلية بالساعات (decimal) للتخزين والعرض التقريبي نستخدم ceilHoursBetween
    const durationHoursDecimal = (end - start) / (1000 * 60 * 60); // ممكن تكون 0.01 ...
    const hoursRounded = ceilHoursBetween(session.startTime, endTime); // نقرب لأعلى ساعة

    // نجلب أسعار الساعات من Firestore settings/pricing
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

    // مجموع الطلبات الآن
    const totalOrders = (session.orders || []).reduce((sum, o) => sum + getOrderPrice(o), 0);

    // تكلفة الجلسة = ساعات مقربة × سعر الساعة
    const sessionCost = hoursRounded * pricePerHour;

    // الكل
    const totalCost = Math.round((sessionCost + totalOrders) * 100) / 100;

    // نحدّث المستند في Firestore ونخزن الحقول المحسوبة
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        endTime,
        finished: true,
        // duration نحتفظ بالمدة الفعلية بشكل عشري (ساعات) للتاريخ/عرض دقيق
        duration: durationHoursDecimal.toFixed(2),
        hoursRounded, // الساعات المقربة
        pricePerHour, // السعر المستخدم
        sessionCost, // تكلفة الجلسة (ساعات × سعر)
        ordersTotal: totalOrders,
        totalCost // المبلغ الإجمالي (جلسة + طلبات)
      });
    } catch (err) {
      console.error('Error updating finished session:', err);
      throw err;
    }

    // نعيد البيانات لاستخدامها فورًا (مثلاً للطباعة)
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
    try {
      const result = await handleFinishSession(selectedSession.id, selectedSession);
      setSuccess('تم إنهاء الجلسة بنجاح!');
      handleCloseDialog();
    } catch (err) {
      setError('فشل إنهاء الجلسة.');
    }
  };

  const handleFinishAndPrint = async () => {
    try {
      const result = await handleFinishSession(selectedSession.id, selectedSession);
      // نمرّر التقرير بيانات الجلسة + القيم المحسوبة
      generateReport({ ...selectedSession, ...result });
      setSuccess('تم إنهاء الجلسة وطباعة التقرير بنجاح!');
      handleCloseDialog();
    } catch (err) {
      setError('فشل إنهاء الجلسة أو طباعة التقرير.');
    }
  };

  // ======== تعديل هنا: generateReport بصيغة مرتبة ومتكاملة ========
  const generateReport = (session) => {
    const docPdf = new jsPDF();

    // إضافة الخط العربي (Amiri)
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

    // نوع الجلسة
    const typeLabel = session.sessionType === 'drinks' ? "مع مشروبات" : "مذاكرة فقط";

    // بيانات أساسية
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

    // عرض الطلبات (كل صنف سطر)
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

    // توقيتات و حسابات
    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : new Date();
    const hoursRounded = session.hoursRounded ?? ceilHoursBetween(session.startTime, session.endTime || new Date().toISOString());
    // pricePerHour قد تم تسجيله عند إنهاء الجلسة، وإلا نحاول جلبه صفر افتراضي
    const pricePerHour = typeof session.pricePerHour !== 'undefined' ? safeNumber(session.pricePerHour) : 0;
    const sessionCost = typeof session.sessionCost !== 'undefined' ? safeNumber(session.sessionCost) : hoursRounded * pricePerHour;
    const ordersTotal = typeof session.ordersTotal !== 'undefined' ? safeNumber(session.ordersTotal) : (session.orders || []).reduce((s,o)=> s + getOrderPrice(o), 0);
    const totalCost = typeof session.totalCost !== 'undefined' ? safeNumber(session.totalCost) : Math.round((sessionCost + ordersTotal)*100)/100;

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

    // حفظ الملف
    const filename = `تقرير_${session.fullName || 'session'}.pdf`;
    docPdf.save(filename);
  };

  // إضافة طلب جديد (داخل الـ Dialog)
  const handleAddOrder = async () => {
    if (!orderItem || !orderPrice) return;
    const newOrder = { item: orderItem, price: Number(orderPrice) };
    const updatedOrders = [...(selectedSession.orders || []), newOrder];

    try {
      await updateDoc(doc(db, 'sessions', selectedSession.id), {
        orders: updatedOrders
      });
      // نحدّث الـ local selectedSession للعرض فوراً
      setSelectedSession({ ...selectedSession, orders: updatedOrders });
      setOrderItem('');
      setOrderPrice('');
    } catch (err) {
      console.error('Error adding order:', err);
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

              <Grid item xs={12}  md={12}>
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

      {/* Dialog الطلبات */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          إدارة الطلبات
          <IconButton aria-label="close" onClick={() => setOrderDialogOpen(false)} sx={{ position: 'absolute', left: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {/* إضافة طلب جديد */}
          <TextField
            fullWidth
            label="الصنف"
            value={orderItem}
            onChange={(e) => setOrderItem(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="السعر"
            type="number"
            value={orderPrice}
            onChange={(e) => setOrderPrice(e.target.value)}
            margin="normal"
          />
          <Button onClick={handleAddOrder} variant="contained" sx={{ mt: 2 }}>إضافة</Button>

          {/* عرض الطلبات الحالية */}
          <Typography sx={{ mt: 3, mb: 1 }}>الطلبات الحالية:</Typography>
          {selectedSession?.orders?.length > 0 ? (
            selectedSession.orders.map((o, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TextField
                  value={getOrderName(o)}
                  onChange={(e) => {
                    // نسمح بتعديل الحقل item (نحافظ على شكل object)
                    const updated = [...selectedSession.orders];
                    const existing = updated[idx] || {};
                    updated[idx] = { ...(typeof existing === 'string' ? { item: existing } : existing), item: e.target.value };
                    setSelectedSession({ ...selectedSession, orders: updated });
                  }}
                  sx={{ mr: 1 }}
                />
                <TextField
                  type="number"
                  value={getOrderPrice(o)}
                  onChange={(e) => {
                    const updated = [...selectedSession.orders];
                    const existing = updated[idx] || {};
                    updated[idx] = { ...(typeof existing === 'string' ? { item: existing } : existing), price: Number(e.target.value) };
                    setSelectedSession({ ...selectedSession, orders: updated });
                  }}
                  sx={{ mr: 1, width: 100 }}
                />
                
                <Button
                  color="error"
                  variant="outlined"
                  onClick={async () => {
                    const updated = selectedSession.orders.filter((_, i) => i !== idx);
                    try {
                      await updateDoc(doc(db, 'sessions', selectedSession.id), {
                        orders: updated
                      });
                      setSelectedSession({ ...selectedSession, orders: updated });
                    } catch (err) {
                      console.error('Error deleting order:', err);
                    }
                  }}
                >
                  حذف
                </Button>
              </Box>
            ))
          ) : (
            <Typography color="text.secondary">لا يوجد طلبات بعد</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Home;
