// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  Container, Box, Typography, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, TextField, InputAdornment, Alert, Tooltip,
  Button, Dialog, DialogTitle, DialogContent, IconButton, Divider
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People, Schedule, AttachMoney, AccessTime,
  Search, CheckCircle, PendingActions, LocalCafe, Visibility, Close
} from "@mui/icons-material";
import {
  collection, onSnapshot, query, orderBy,
  doc, getDoc, setDoc
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
  const diff = (new Date(end) - new Date(start)) / 1000;
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
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [basicPrice, setBasicPrice] = useState(0);
  const [drinksPrice, setDrinksPrice] = useState(0);

  const [openReport, setOpenReport] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

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
        setFilteredSessions(data);
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

  const updatePricing = async (field, value) => {
    try {
      const pricingRef = doc(db, "settings", "pricing");
      await setDoc(pricingRef, {
        basicPrice: safeNumber(field === "basicPrice" ? value : basicPrice),
        drinksPrice: safeNumber(field === "drinksPrice" ? value : drinksPrice),
      });
    } catch (err) {
      console.error("updatePricing error:", err);
    }
  };

  // ✅ فلترة
  useEffect(() => {
    const filtered = sessions.filter((session) => {
      const matchText =
        (session.fullName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (session.city || "").toLowerCase().includes(searchQuery.toLowerCase());

      const sessionDate = new Date(session.startTime);
      const isAfterStart = fromDate ? sessionDate >= new Date(fromDate) : true;
      const isBeforeEnd = toDate
        ? sessionDate <= new Date(toDate + "T23:59")
        : true;

      return matchText && isAfterStart && isBeforeEnd;
    });
    setFilteredSessions(filtered);
  }, [searchQuery, fromDate, toDate, sessions]);

  // ✅ حساب الإحصائيات
  const calculateMetrics = () => {
    const startFilter = fromDate ? new Date(fromDate) : null;
    const endFilter = toDate ? new Date(toDate + "T23:59") : null;

    const filteredByDate = sessions.filter((s) => {
      const d = new Date(s.startTime);
      const afterStart = startFilter ? d >= startFilter : true;
      const beforeEnd = endFilter ? d <= endFilter : true;
      return afterStart && beforeEnd;
    });

    const active = filteredByDate.filter((s) => !s.finished);

    const totalHours = filteredByDate.reduce((sum, s) => {
      if (s.finished && s.endTime && s.sessionType !== "take away") {
        return sum + ceilHoursBetween(s.startTime, s.endTime);
      }
      return sum;
    }, 0);

    const totalRevenue = filteredByDate.reduce((sum, s) => {
      if (s.finished && s.endTime) {
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
      return sum;
    }, 0);

    return {
      activeSessions: active.length,
      totalSessions: filteredByDate.length,
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
    const durationHours =
      session.sessionType === "take away"
        ? 0
        : ceilHoursBetween(start, end);
    const pricePerHour =
      session.sessionType === "drinks"
        ? drinksPrice
        : session.sessionType === "take away"
        ? 0
        : basicPrice;

    const ordersTotal = (session.orders || []).reduce(
      (acc, o) => acc + getOrderPrice(o),
      0
    );
    const cost = durationHours * pricePerHour + ordersTotal;

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

  // ✅ render
  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" dir="rtl" sx={{ py: 2 }}>
        <Typography variant="h4" mb={3}>
          <DashboardIcon sx={{ mr: 1 }} /> لوحة التحكم
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Cards */}
        <Grid container spacing={3} alignItems="stretch" mb={4}>
          {[
            { icon: <PendingActions />, label: "الجلسات النشطة", value: metrics.activeSessions },
            { icon: <People />, label: "إجمالي الجلسات", value: metrics.totalSessions },
            { icon: <AccessTime />, label: "ساعات (مقربة)", value: metrics.monthlyHours.toFixed(0) },
            { icon: <AttachMoney />, label: "إيرادات الفترة", value: formatCurrency(metrics.monthlyRevenue) },
          ].map((item, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    {React.cloneElement(item.icon, {
                      sx: { fontSize: 40, color: "primary.main" },
                    })}
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

        {/* Sessions Table */}
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
                    <TableCell>نوع الجلسة</TableCell>
                    <TableCell>المشروبات</TableCell>
                    <TableCell>البداية</TableCell>
                    <TableCell>المدة</TableCell>
                    <TableCell>التكلفة</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>عرض التقرير</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredSessions.map((session) => {
                    const start = new Date(session.startTime);
                    const end = session.endTime ? new Date(session.endTime) : new Date();
                    const durationHours =
                      session.sessionType === "take away"
                        ? 0
                        : ceilHoursBetween(start, end);

                    const pricePerHour =
                      session.sessionType === "drinks"
                        ? drinksPrice
                        : session.sessionType === "take away"
                        ? 0
                        : basicPrice;

                    const ordersTotal = (session.orders || []).reduce(
                      (acc, o) => acc + getOrderPrice(o),
                      0
                    );
                    const cost = durationHours * pricePerHour + ordersTotal;

                    return (
                      <TableRow key={session.id}>
                        <TableCell>{session.fullName}</TableCell>
                        <TableCell>{session.phoneNumber}</TableCell>
                        <TableCell>{session.city}</TableCell>
                        <TableCell>{session.studyYear}</TableCell>

                        <TableCell>
                          <Tooltip
                            title={
                              session.sessionType === "drinks"
                                ? "بمشروبات"
                                : session.sessionType === "take away"
                                ? "تيك أواي"
                                : "بدون مشروبات"
                            }
                          >
                            <Chip
                              label={
                                session.sessionType === "drinks"
                                  ? "مع مشروبات"
                                  : session.sessionType === "take away"
                                  ? "تيك أواي"
                                  : "مذاكرة فقط"
                              }
                              color={
                                session.sessionType === "drinks"
                                  ? "secondary"
                                  : session.sessionType === "take away"
                                  ? "success"
                                  : "default"
                              }
                              icon={<LocalCafe />}
                              size="small"
                            />
                          </Tooltip>
                        </TableCell>

                        <TableCell>{renderOrdersInline(session.orders)}</TableCell>
                        <TableCell>{new Date(session.startTime).toLocaleString()}</TableCell>

                        <TableCell>
                          {session.finished ? (
                            formatHMS(session.startTime, session.endTime)
                          ) : (
                            <Timer startTime={session.startTime} />
                          )}
                        </TableCell>

                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="bold">
                            الإجمالي: {formatCurrency(cost)}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {session.finished ? (
                            <Chip
                              label="منتهية"
                              color="success"
                              icon={<CheckCircle />}
                              size="small"
                            />
                          ) : (
                            <Chip
                              label="نشطة"
                              color="primary"
                              icon={<Schedule />}
                              size="small"
                            />
                          )}
                        </TableCell>

                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => openSessionReport(session)}
                          >
                            عرض
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      </Container>

      {/* Dialog التقرير */}
      <Dialog open={openReport} onClose={closeSessionReport} maxWidth="sm" fullWidth dir="rtl">
        <DialogTitle>
          تقرير الجلسة
          <IconButton
            aria-label="close"
            onClick={closeSessionReport}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedSession ? (
            <>
              <Typography><b>الاسم:</b> {selectedSession.fullName}</Typography>
              <Typography><b>الهاتف:</b> {selectedSession.phoneNumber}</Typography>
              <Typography><b>المدينة:</b> {selectedSession.city}</Typography>
              <Typography><b>الصف:</b> {selectedSession.studyYear}</Typography>
              <Typography>
                <b>نوع الجلسة:</b>{" "}
                {selectedSession.sessionType === "drinks"
                  ? "مع مشروبات"
                  : selectedSession.sessionType === "take away"
                  ? "تيك أواي"
                  : "بدون مشروبات"}
              </Typography>

              <Divider sx={{ my: 1 }} />

              <Typography><b>المشروبات / الطلبات:</b></Typography>
              {selectedSession.orders && selectedSession.orders.length > 0 ? (
                selectedSession.orders.map((o, i) => (
                  <Typography key={i} sx={{ ml: 1 }}>
                    - {getOrderName(o)}{" "}
                    {getOrderPrice(o) ? `: ${getOrderPrice(o)} ج.م` : ""}
                  </Typography>
                ))
              ) : (
                <Typography sx={{ ml: 1 }}>—</Typography>
              )}

              <Divider sx={{ my: 1 }} />

              <Typography><b>البداية:</b> {new Date(selectedSession.startTime).toLocaleString()}</Typography>
              <Typography><b>النهاية:</b> {selectedSession.endTime ? new Date(selectedSession.endTime).toLocaleString() : "مازالت نشطة"}</Typography>

              {(() => {
                const { start, end, durationHours, pricePerHour, ordersTotal, cost } =
                  selectedSession._computed || {};
                const sessionCost = durationHours * pricePerHour;
                const total = sessionCost + ordersTotal;
                return (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography><b>المدة (مقربة):</b> {durationHours} {durationHours === 1 ? "ساعة" : "ساعات"}</Typography>
                    <Typography><b>سعر الساعة:</b> {formatCurrency(pricePerHour)}</Typography>
                    <Typography><b>تكلفة الجلسة (ساعات × سعر):</b> {formatCurrency(sessionCost)}</Typography>
                    <Typography><b>تكلفة الطلبات:</b> {formatCurrency(ordersTotal)}</Typography>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      <b>السعر الكلي:</b> {formatCurrency(total)}
                    </Typography>
                  </>
                );
              })()}
            </>
          ) : (
            <Typography>لا توجد بيانات للجلسة.</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
