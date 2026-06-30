import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Alert, Button, Grid, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';
import {
  collection, onSnapshot, query, orderBy, where,
  doc, getDoc, setDoc, deleteDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import Navbar from '../components/Navbar';
import DateFilterSection from '../components/dashboard/DateFilterSection';
import PricingSection from '../components/dashboard/PricingSection';
import MetricsCards from '../components/dashboard/MetricsCards';
import SessionsTable from '../components/dashboard/SessionsTable';
import SessionReportDialog from '../components/dashboard/SessionReportDialog';
import DeleteConfirmationDialog from '../components/dashboard/DeleteConfirmationDialog';
import { safeNumber, getOrderPrice, ceilHoursBetween } from '../utils/helpers';

const Dashboard = () => {
  const [todaySessions, setTodaySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [basicPrice, setBasicPrice] = useState(0);
  const [drinksPrice, setDrinksPrice] = useState(0);
  const [openReport, setOpenReport] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // حساب نطاق اليوم الحالي
  const getTodayRange = () => {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
  };

  // تحميل جلسات اليوم فقط
  useEffect(() => {
    const { startOfDay, endOfDay } = getTodayRange();
    const q = query(
      collection(db, "sessions"),
      where("startTime", ">=", startOfDay.toISOString()),
      where("startTime", "<=", endOfDay.toISOString()),
      orderBy("startTime", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        startTime: d.data().startTime,
        endTime: d.data().endTime || null,
      }));
      setTodaySessions(data);
      setLoading(false);
    }, (err) => {
      console.error("Error loading today sessions:", err);
      setError("حدث خطأ أثناء تحميل جلسات اليوم");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // تحميل الأسعار
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
        }
      } catch (err) {
        console.error("fetchPricing error:", err);
      }
    };
    fetchPricing();
  }, []);

  const savePricing = async () => {
    try {
      await setDoc(doc(db, "settings", "pricing"), {
        basicPrice: safeNumber(basicPrice),
        drinksPrice: safeNumber(drinksPrice),
      });
      alert("تم حفظ الأسعار بنجاح");
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  // حساب الإحصائيات (اليوم فقط)
  const calculateMetrics = () => {
    const active = todaySessions.filter(s => !s.finished).length;
    const total = todaySessions.length;

    const hours = todaySessions.reduce((sum, s) => {
      if (s.finished && s.sessionType !== "take away") {
        return sum + (s.hoursRounded || ceilHoursBetween(s.startTime, s.endTime));
      }
      return sum;
    }, 0);

    const revenue = todaySessions.reduce((sum, s) => {
      if (!s.finished) return sum;
      if (s.totalCost !== undefined) return sum + safeNumber(s.totalCost);

      const price = s.sessionType === "drinks" ? drinksPrice :
                   s.sessionType === "basic" ? basicPrice : 0;
      const hours = s.sessionType === "take away" ? 0 : ceilHoursBetween(s.startTime, s.endTime);
      const orders = (s.orders || []).reduce((a, o) => a + getOrderPrice(o), 0);
      return sum + (hours * price + orders);
    }, 0);

    return { todayActiveSessions: active, todaySessions: total, todayHours: hours, todayRevenue: revenue };
  };

  const metrics = calculateMetrics();

  // دوال التحديد
  const handleSessionSelect = (id, checked) => {
    setSelectedSessions(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const handleSelectAll = (ids) => setSelectedSessions(ids);
  const handleDeselectAll = () => setSelectedSessions([]);

  // حذف جلسة
  const confirmDeleteSession = (session) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    await deleteDoc(doc(db, "sessions", sessionToDelete.id));
    setDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  // حذف جماعي
  const handleBulkDelete = async () => {
    if (selectedSessions.length === 0) return;
    const batch = writeBatch(db);
    selectedSessions.forEach(id => batch.delete(doc(db, 'sessions', id)));
    await batch.commit();
    setSelectedSessions([]);
    setBulkDeleteOpen(false);
    alert(`تم حذف ${selectedSessions.length} جلسة`);
  };

  // عرض التقرير
  const openSessionReport = (session) => {
    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : new Date();
    const hours = session.sessionType === "take away" ? 0 : ceilHoursBetween(start, end);
    const price = safeNumber(session.pricePerHour) || (session.sessionType === "drinks" ? drinksPrice : basicPrice);
    const ordersTotal = (session.orders || []).reduce((a, o) => a + getOrderPrice(o), 0);
    const cost = safeNumber(session.totalCost) || (hours * price + ordersTotal);

    setSelectedSession({ ...session, _computed: { hours, price, ordersTotal, cost } });
    setOpenReport(true);
  };

  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" dir="rtl" sx={{ py: 2 }}>
        <Typography variant="h4" mb={3}>
          <DashboardIcon sx={{ mr: 1 }} /> لوحة التحكم
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* فلتر التاريخ → ينقل لصفحة منفصلة */}
        <DateFilterSection />

        {/* محتوى اليوم الحالي فقط */}
        <PricingSection
          basicPrice={basicPrice}
          drinksPrice={drinksPrice}
          onBasicPriceChange={setBasicPrice}
          onDrinksPriceChange={setDrinksPrice}
          onSave={savePricing}
        />

        <MetricsCards metrics={metrics} />

        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="h6">جلسات اليوم ({todaySessions.length})</Typography>
          <Button variant="outlined" color="error" disabled={!selectedSessions.length} onClick={() => setBulkDeleteOpen(true)}>
            حذف المحدد ({selectedSessions.length})
          </Button>
          <Button variant="outlined" onClick={() => handleSelectAll(todaySessions.map(s => s.id))}>تحديد الكل</Button>
          <Button variant="outlined" disabled={!selectedSessions.length} onClick={handleDeselectAll}>إلغاء</Button>
        </Box>

        <SessionsTable
          sessions={todaySessions}
          pricing={{ basicPrice, drinksPrice }}
          onOpenReport={openSessionReport}
          onConfirmDelete={confirmDeleteSession}
          selectedSessions={selectedSessions}
          onSessionSelect={handleSessionSelect}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
        />

        {/* تقرير الجلسة */}
        <SessionReportDialog open={openReport} session={selectedSession} onClose={() => setOpenReport(false)} />

        {/* تأكيد الحذف */}
        <DeleteConfirmationDialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDeleteSession} />

        {/* تأكيد الحذف الجماعي */}
        <Dialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)}>
          <DialogTitle>تأكيد الحذف</DialogTitle>
          <DialogContent>
            <Typography>هل تريد حذف {selectedSessions.length} جلسة؟</Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>لا يمكن التراجع</Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBulkDeleteOpen(false)}>إلغاء</Button>
            <Button color="error" variant="contained" onClick={handleBulkDelete}>حذف</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Dashboard;