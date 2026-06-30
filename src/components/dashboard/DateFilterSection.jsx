// src/components/dashboard/DateFilterSection.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, TextField, Typography, Box } from '@mui/material';

const DateFilterSection = () => {
  const navigate = useNavigate();

  const handleDateChange = (e) => {
    const value = e.target.value;
    if (value) {
      navigate(`/report/${value}`);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa' }}>
      <Box sx={{ maxWidth: 300 }}>
        <TextField
          label="اختر التاريخ لعرض التقرير"
          type="date"
          fullWidth
          onChange={handleDateChange}
          InputLabelProps={{ shrink: true }}
          inputProps={{
            max: new Date().toISOString().split('T')[0],
          }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          اختر تاريخًا لعرض التقرير اليومي الكامل
        </Typography>
      </Box>
    </Paper>
  );
};

export default DateFilterSection;