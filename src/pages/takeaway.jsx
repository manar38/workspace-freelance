// TakeawayOrders.jsx
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
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../utils/firebase";

const TakeawayOrders = () => {
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [orders, setOrders] = useState([]);

  // 🔹 إضافة صنف للطلب المؤقت
  const handleAddItem = () => {
    if (!itemName || !itemPrice) return;
    setOrders([...orders, { name: itemName, price: Number(itemPrice) }]);
    setItemName("");
    setItemPrice("");
  };

  // 🔹 حذف صنف من الطلب المؤقت
  const handleRemoveItem = (index) => {
    setOrders(orders.filter((_, i) => i !== index));
  };

  // 🔹 حفظ الأوردر في Firestore
  const handleAddOrder = async () => {
    if (orders.length === 0) return;

    try {
      await addDoc(collection(db, "sessions"), {
        fullName: "----",
        phoneNumber: "----",
        city: "----",
        studyYear: "----",
        sessionType: "take away", // ✅ نوع الجلسة الجديد
        orders: orders,
        startTime: new Date(), // وقت إنشاء الأوردر
        endTime: new Date(),
        finished: true, // ✅ الأوردر خلص مباشرة
      });

      setOrders([]);
      alert("✅ تم إضافة الطلب Take Away بنجاح");
    } catch (error) {
      console.error("Error adding takeaway order:", error);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        إضافة طلب Take Away
      </Typography>

      <Box>
        <Grid container spacing={2}>
          {/* اسم المشروب */}
          <Grid item xs={12} sm={5}>
            <TextField
              label="اسم المشروب"
              fullWidth
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </Grid>

          {/* السعر */}
          <Grid item xs={12} sm={3}>
            <TextField
              label="السعر"
              type="number"
              fullWidth
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
            />
          </Grid>

          {/* زر الإضافة لقائمة مؤقتة */}
          <Grid item xs={12} sm={4}>
            <Button
              variant="outlined"
              fullWidth
              sx={{ height: "100%" }}
              onClick={handleAddItem}
            >
              إضافة للصنف
            </Button>
          </Grid>
        </Grid>

        {/* عرض الأصناف المضافة */}
        <List>
          {orders.map((order, index) => (
            <ListItem
              key={index}
              secondaryAction={
                <IconButton edge="end" onClick={() => handleRemoveItem(index)}>
                  <Delete />
                </IconButton>
              }
            >
              <ListItemText
                primary={`${order.name}`}
                secondary={`${order.price} ج`}
              />
            </ListItem>
          ))}
        </List>

        {/* زر إضافة الطلب للـ Dashboard */}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleAddOrder}
        >
          إضافة للـ Dashboard
        </Button>
      </Box>
    </Paper>
  );
};

export default TakeawayOrders;
