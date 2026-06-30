import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, TextField, List, ListItem,
  ListItemText, ListItemSecondaryAction, IconButton, Divider,
  Alert
} from '@mui/material';
import { Close, Delete } from '@mui/icons-material';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { getOrderName, getOrderPrice, safeNumber } from '../utils/helpers';

const OrdersDialog = ({ open, session, onClose, onError, onSuccess, onUpdate }) => {
  const [orderItem, setOrderItem] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [loading, setLoading] = useState(false);

  if (!session) return null;

  // إضافة طلب جديد
  const handleAddOrder = async () => {
    if (!orderItem.trim() || !orderPrice || isNaN(orderPrice) || Number(orderPrice) <= 0) {
      onError('يرجى إدخال اسم الصنف وسعر صحيح.');
      return;
    }

    const newOrder = { 
      item: orderItem.trim(), 
      price: safeNumber(orderPrice) 
    };
    const updatedOrders = [...(session.orders || []), newOrder];

    try {
      setLoading(true);
      await updateDoc(doc(db, 'sessions', session.id), {
        orders: updatedOrders
      });
      onUpdate?.({ ...session, orders: updatedOrders });
      setOrderItem('');
      setOrderPrice('');
      onSuccess('تم إضافة الطلب بنجاح!');
    } catch (err) {
      console.error('Error adding order:', err);
      onError('فشل إضافة الطلب، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // تعديل طلب موجود
  const handleEditOrder = async (index, field, value) => {
    const updatedOrders = [...(session.orders || [])];
    const existing = updatedOrders[index] || {};
    
    updatedOrders[index] = { 
      ...existing, 
      [field]: field === 'price' ? safeNumber(value) : value 
    };

    try {
      setLoading(true);
      await updateDoc(doc(db, 'sessions', session.id), {
        orders: updatedOrders
      });
      onSuccess('تم تعديل الطلب بنجاح!');
    } catch (err) {
      console.error('Error editing order:', err);
      onError('فشل تعديل الطلب، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // حذف طلب
  const handleDeleteOrder = async (index) => {
    const updatedOrders = (session.orders || []).filter((_, i) => i !== index);
    
    try {
      setLoading(true);
      await updateDoc(doc(db, 'sessions', session.id), {
        orders: updatedOrders
      });
      onSuccess('تم حذف الطلب بنجاح!');
    } catch (err) {
      console.error('Error deleting order:', err);
      onError('فشل حذف الطلب، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const totalOrders = (session.orders || []).reduce((sum, order) => sum + getOrderPrice(order), 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        إدارة الطلبات - {session.fullName}
        <IconButton aria-label="close" onClick={onClose} sx={{ position: 'absolute', left: 8, top: 8 }}>
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography variant="subtitle1" gutterBottom>إضافة طلب جديد</Typography>
        
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="اسم الصنف"
            value={orderItem}
            onChange={(e) => setOrderItem(e.target.value)}
            margin="normal"
            required
            disabled={loading}
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
            disabled={loading}
          />
          <Button
            onClick={handleAddOrder}
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            disabled={!orderItem || !orderPrice || isNaN(orderPrice) || Number(orderPrice) <= 0 || loading}
            fullWidth
          >
            {loading ? 'جاري الإضافة...' : 'إضافة الطلب'}
          </Button>
        </Box>

        <Divider />

        <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
          الطلبات الحالية ({session.orders?.length || 0})
        </Typography>

        {(session.orders || []).length > 0 ? (
          <List dense>
            {(session.orders || []).map((order, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TextField
                        value={getOrderName(order)}
                        onChange={(e) => handleEditOrder(index, 'item', e.target.value)}
                        size="small"
                        sx={{ flex: 2 }}
                        disabled={loading}
                      />
                      <TextField
                        type="number"
                        value={getOrderPrice(order)}
                        onChange={(e) => handleEditOrder(index, 'price', e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                        inputProps={{ min: 0, step: 0.01 }}
                        disabled={loading}
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDeleteOrder(index)}
                    disabled={loading}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
            لا يوجد طلبات بعد
          </Typography>
        )}

        {(session.orders || []).length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="h6" align="center">
              إجمالي الطلبات: {totalOrders.toFixed(2)} ج
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary" disabled={loading}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrdersDialog;