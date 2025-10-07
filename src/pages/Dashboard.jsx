// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  Container, Box, Typography, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, Tooltip,
  Button, Dialog, DialogTitle, DialogContent, IconButton, Divider, DialogActions,
  TextField
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People, Schedule, AttachMoney, AccessTime,
  CheckCircle, PendingActions, LocalCafe, Visibility, Close, Delete
} from "@mui/icons-material";
import {
  collection, onSnapshot, query, orderBy,
  doc, getDoc, setDoc, deleteDoc
} from "firebase/firestore";
import { db } from "../utils/firebase";
import Navbar from "../components/Navbar";
import Timer from "../components/Timer";

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (amount) => {
  const n = safeNumber(amount);
  return `${n.toFixed(2)} ج`;
};

const ceilHoursBetween = (start, end) => {
  const ms = new Date(end) - new Date(start);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 3600000);
};

const formatHMS = (start, end) => {
  const diff = Math.max(0, Math.floor((now - start) / 1000));

  if (!Number.isFinite(diff) || diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = Math.floor(diff % 60);
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const getOrderName = (o) => {
  if (!o) return "";
  if (typeof o === "string") return o;
  return o.name || o.item || o.drinkName || "";
};
const getOrderPrice = (o) => {
  if (!o) return 0;
  if (typeof o === "string") return 0;
  return safeNumber(o.price || o.cost || 0);
};

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [basicPrice, setBasicPrice] = useState(0);
  const [drinksPrice, setDrinksPrice] = useState(0);

  const [openReport, setOpenReport] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  // ✅ تحميل الجلسات
  useEffect(() => {
    const q = query(collection(db, "sessions"), orderBy("startTime", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const data = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            ...raw,
            startTime: raw.startTime,
            endTime: raw.endTime || null,
          };
        });
        setSessions(data);
        setLoading(false);
      } catch (err) {
        console.error("sessions snapshot error:", err);
        setError("حدث خطأ أثناء تحميل الجلسات.");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ تحميل الأسعار
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const pricingRef = doc(db, "settings", "pricing");
        const snap = await getDoc(pricingRef);
        if (snap.exists()) {
          const data = snap.data();
          setBasicPrice(safeNumber(data.basicPrice));
          setDrinksPrice(safeNumber(data.drinksPrice));
        } else {
          await setDoc(pricingRef, { basicPrice: 0, drinksPrice: 0 });
          setBasicPrice(0);
          setDrinksPrice(0);
        }
      } catch (err) {
        console.error("fetchPricing error:", err);
      }
    };
    fetchPricing();
  }, []);

  // ✅ حفظ الأسعار
  const savePricing = async () => {
    try {
      await setDoc(doc(db, "settings", "pricing"), {
        basicPrice: safeNumber(basicPrice),
        drinksPrice: safeNumber(drinksPrice),
      });
      alert("✅ تم حفظ أسعار الساعة بنجاح");
    } catch (err) {
      console.error("savePricing error:", err);
      alert("⚠️ حدث خطأ أثناء حفظ الأسعار");
    }
  };

  // ✅ حساب الإحصائيات
  const calculateMetrics = () => {
    const totalHours = sessions.reduce((sum, s) => {
      if (s.finished && s.endTime && s.sessionType !== "take away") {
        // استخدم hoursRounded إذا موجود، وإلا احسب
        return sum + (s.hoursRounded || ceilHoursBetween(s.startTime, s.endTime));
      }
      return sum;
    }, 0);

    const totalRevenue = sessions.reduce((sum, s) => {
      if (s.finished && s.endTime) {
        // استخدم totalCost إذا موجود، وإلا احسب كما قبل
        if (typeof s.totalCost !== 'undefined') {
          return sum + safeNumber(s.totalCost);
        } else {
          let pricePerHour = 0;
          if (s.sessionType === "drinks") pricePerHour = drinksPrice;
          else if (s.sessionType === "basic") pricePerHour = basicPrice;
          else if (s.sessionType === "take away") pricePerHour = 0;

          const hours =
            s.sessionType === "take away"
              ? 0
              : ceilHoursBetween(s.startTime, s.endTime);
          const ordersTotal = (s.orders || []).reduce(
            (acc, o) => acc + getOrderPrice(o),
            0
          );
          return sum + hours * pricePerHour + ordersTotal;
        }
      }
      return sum;
    }, 0);

    return {
      activeSessions: sessions.filter((s) => !s.finished).length,
      totalSessions: sessions.length,
      monthlyHours: totalHours,
      monthlyRevenue: totalRevenue,
    };
  };

  const metrics = calculateMetrics();

  const renderOrdersInline = (orders) => {
    if (!orders || !orders.length) return "—";
    return orders
      .map((o) => {
        if (typeof o === "string") return o;
        const name = getOrderName(o) || "";
        const price = getOrderPrice(o);
        return price ? `${name} (${price}ج)` : name;
      })
      .filter(Boolean)
      .join(", ");
  };

  // ✅ فتح التقرير
  const openSessionReport = (session) => {
    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : new Date();
    const durationHours = session.sessionType === "take away" ? 0 : (session.hoursRounded || ceilHoursBetween(start, end));
    const pricePerHour = safeNumber(session.pricePerHour) || (session.sessionType === "drinks" ? drinksPrice : (session.sessionType === "take away" ? 0 : basicPrice));
    const ordersTotal = safeNumber(session.ordersTotal) || (session.orders || []).reduce((acc, o) => acc + getOrderPrice(o), 0);
    const cost = safeNumber(session.totalCost) || (durationHours * pricePerHour + ordersTotal);

    setSelectedSession({
      ...session,
      _computed: { start, end, durationHours, pricePerHour, ordersTotal, cost },
    });
    setOpenReport(true);
  };

  const closeSessionReport = () => {
    setSelectedSession(null);
    setOpenReport(false);
  };

  // ✅ فتح Dialog الحذف
  const confirmDeleteSession = (session) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteDoc(doc(db, "sessions", sessionToDelete.id));
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (err) {
      console.error("deleteSession error:", err);
      alert("حدث خطأ أثناء حذف الجلسة");
    }
  };

  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" dir="rtl" sx={{ py: 2 }}>
        <Typography variant="h4" mb={3}>
          <DashboardIcon sx={{ mr: 1 }} /> لوحة التحكم
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* 🔹 حقول إدخال أسعار الساعة */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                label="سعر الساعة بدون مشروبات"
                type="number"
                fullWidth
                value={basicPrice}
                onChange={(e) => setBasicPrice(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="سعر الساعة مع مشروبات"
                type="number"
                fullWidth
                value={drinksPrice}
                onChange={(e) => setDrinksPrice(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ height: "100%" }}
                onClick={savePricing}
              >
                حفظ الأسعار
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* 🔹 الكروت الخاصة بالإحصائيات */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">الجلسات النشطة</Typography>
                <Typography variant="h4">{metrics.activeSessions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">إجمالي الجلسات</Typography>
                <Typography variant="h4">{metrics.totalSessions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">إجمالي الساعات</Typography>
                <Typography variant="h4">{metrics.monthlyHours}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">إجمالي الإيراد</Typography>
                <Typography variant="h4">{formatCurrency(metrics.monthlyRevenue)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 🔹 جدول الجلسات (زي القديم) */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
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
              {sessions.map((s) => {
                const start = new Date(s.startTime);
                const end = s.endTime ? new Date(s.endTime) : new Date();
                const durationHours = s.sessionType === "take away" ? 0 : (s.hoursRounded || ceilHoursBetween(start, end));
                const pricePerHour = safeNumber(s.pricePerHour) || (s.sessionType === "drinks" ? drinksPrice : (s.sessionType === "take away" ? 0 : basicPrice));
                const ordersTotal = safeNumber(s.ordersTotal) || (s.orders || []).reduce((acc, o) => acc + getOrderPrice(o), 0);
                const cost = safeNumber(s.totalCost) || (durationHours * pricePerHour + ordersTotal);

                return (
                  <TableRow key={s.id}>
                    <TableCell>{s.fullName}</TableCell>
                    <TableCell>{s.phoneNumber}</TableCell>
                    <TableCell>{s.city}</TableCell>
                    <TableCell>{s.studyYear}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          s.sessionType === "drinks"
                            ? "مع مشروبات"
                            : s.sessionType === "take away"
                            ? "تيك أواي"
                            : "مذاكرة فقط"
                        }
                        color={
                          s.sessionType === "drinks"
                            ? "secondary"
                            : s.sessionType === "take away"
                            ? "success"
                            : "default"
                        }
                        icon={<LocalCafe />}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{renderOrdersInline(s.orders)}</TableCell>
                    <TableCell>{new Date(s.startTime).toLocaleString()}</TableCell>
                    <TableCell>
                      {s.finished ? (
                        formatHMS(s.startTime, s.endTime)
                      ) : (
                        <Timer startTime={s.startTime} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
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
                      <Tooltip title="عرض التقرير">
                        <IconButton onClick={() => openSessionReport(s)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton color="error" onClick={() => confirmDeleteSession(s)}>
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 🔹 تقرير الجلسة */}
        <Dialog open={openReport} onClose={closeSessionReport} fullWidth maxWidth="sm">
          <DialogTitle>
            تقرير الجلسة
            <IconButton onClick={closeSessionReport} sx={{ position: "absolute", left: 8, top: 8 }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {selectedSession && (
              <Box>
                <Typography>الاسم: {selectedSession.fullName}</Typography>
                <Typography>الهاتف: {selectedSession.phoneNumber}</Typography>
                <Typography>المدينة: {selectedSession.city}</Typography>
                <Typography>الصف: {selectedSession.studyYear}</Typography>
                <Typography>النوع: {selectedSession.sessionType}</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography>الطلبات: {renderOrdersInline(selectedSession.orders)}</Typography>
                <Typography>
                  وقت البداية: {new Date(selectedSession._computed.start).toLocaleString()}
                </Typography>
                <Typography>
                  وقت النهاية: {selectedSession.finished ? new Date(selectedSession._computed.end).toLocaleString() : "—"}
                </Typography>
                <Typography>المدة: {selectedSession._computed.durationHours} ساعة</Typography>
                <Typography>سعر الساعة: {formatCurrency(selectedSession._computed.pricePerHour)}</Typography>
                <Typography>تكلفة الطلبات: {formatCurrency(selectedSession._computed.ordersTotal)}</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6">إجمالي: {formatCurrency(selectedSession._computed.cost)}</Typography>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {/* 🔹 Dialog تأكيد الحذف */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>تأكيد الحذف</DialogTitle>
          <DialogContent>
            <Typography>هل أنت متأكد من حذف هذه الجلسة؟</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button color="error" onClick={handleDeleteSession}>حذف</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Dashboard;