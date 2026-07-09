import React from 'react';
import { Paper, Grid, TextField, Button } from '@mui/material';

const PricingSection = ({ basicPrice, drinksPrice, onBasicPriceChange, onDrinksPriceChange, onSave }) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={4}>
          <TextField
            label="سعر الساعة بدون مشروبات"
            type="number"
            fullWidth
            value={basicPrice}
            onChange={(e) => onBasicPriceChange(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="سعر الساعة مع مشروبات"
            type="number"
            fullWidth
            value={drinksPrice}
            onChange={(e) => onDrinksPriceChange(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ height: "100%" }}
            onClick={onSave}
          >
            حفظ الأسعار
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PricingSection;