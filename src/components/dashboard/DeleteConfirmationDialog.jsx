import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

const DeleteConfirmationDialog = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>تأكيد الحذف</DialogTitle>
      <DialogContent>
        <Typography>هل أنت متأكد من حذف هذه الجلسة؟</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button color="error" onClick={onConfirm}>حذف</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;