import React, { useState } from "react";
import {
  Grid,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  Divider
} from "@mui/material";
import { Delete, LocalCafe } from "@mui/icons-material";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { safeNumber } from "../../utils/helpers";

const TakeawayOrders = () => {
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [orders, setOrders] = useState([]);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // الحصول على تاريخ اليوم بصيغة YYYY-MM-DD (في الخلفية فقط)
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // الحصول على وقت بداية اليوم (00:00:00)
  const getStartOfToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  // الحصول على وقت نهاية اليوم (23:59:59)
  const getEndOfToday = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  };

  // إضافة صنف للطلب المؤقت
  const handleAddItem = () => {
    if (!itemName.trim()) {
      setError("يرجى إدخال اسم الصنف");
      return;
    }
    
    if (!itemPrice || safeNumber(itemPrice) <= 0) {
      setError("يرجى إدخال سعر صحيح");
      return;
    }

    setOrders([...orders, { 
      name: itemName.trim(), 
      price: safeNumber(itemPrice) 
    }]);
    setItemName("");
    setItemPrice("");
    setError("");
  };

  // حذف صنف من الطلب المؤقت
  const handleRemoveItem = (index) => {
    setOrders(orders.filter((_, i) => i !== index));
  };

  // حفظ الأوردر في Firestore
  const handleAddOrder = async () => {
    if (orders.length === 0) {
      setError("يرجى إضافة أصناف للطلب أولاً");
      return;
    }

    try {
      const startOfToday = getStartOfToday();
      const endOfToday = getEndOfToday();
      const todayDate = getTodayDate();

      await addDoc(collection(db, "sessions"), {
        fullName: "طلب تيك أواي",
        phoneNumber: "----",
        city: "----",
        studyYear: "----",
        sessionType: "take away",
        orders: orders,
        startTime: startOfToday.toISOString(), // بداية اليوم
        endTime: endOfToday.toISOString(),     // نهاية اليوم
        finished: true,
        totalCost: orders.reduce((sum, order) => sum + order.price, 0),
        // إضافة حقل التاريخ للاستخدام في الأرشيف
        sessionDate: todayDate,
        createdAt: new Date().toISOString()
      });

      setOrders([]);
      setSuccess("✅ تم إضافة الطلب Take Away بنجاح");
      setError("");
      
      // إخفاء رسالة النجاح بعد 3 ثواني
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error adding takeaway order:", error);
      setError("❌ حدث خطأ أثناء إضافة الطلب");
    }
  };

  const totalPrice = orders.reduce((sum, order) => sum + order.price, 0);

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <LocalCafe sx={{ mr: 1 }} />
        إضافة طلب Take Away
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box>
        <Grid container spacing={2} alignItems="center">
          {/* اسم المشروب */}
          <Grid item xs={12} sm={5}>
            <TextField
              label="اسم الصنف"
              fullWidth
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
            />
          </Grid>

          {/* السعر */}
          <Grid item xs={12} sm={3}>
            <TextField
              label="السعر (ج)"
              type="number"
              fullWidth
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>

          {/* زر الإضافة */}
          <Grid item xs={12} sm={4}>
            <Button
              variant="outlined"
              fullWidth
              sx={{ height: "56px" }}
              onClick={handleAddItem}
            >
              إضافة للطلب
            </Button>
          </Grid>
        </Grid>

        {/* عرض الأصناف المضافة */}
        {orders.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              الأصناف المضافة ({orders.length})
            </Typography>
            <List dense>
              {orders.map((order, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <IconButton 
                      edge="end" 
                      onClick={() => handleRemoveItem(index)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={order.name}
                    secondary={`${order.price.toFixed(2)} ج`}
                  />
                </ListItem>
              ))}
            </List>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Typography variant="h6">
                الإجمالي: {totalPrice.toFixed(2)} ج
              </Typography>
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddOrder}
                size="large"
              >
                إضافة الطلب للداشبورد
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default TakeawayOrders;