import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { Today, AccessTime, AttachMoney, Groups } from '@mui/icons-material';
import { formatCurrency } from '../../utils/helpers';

const MetricsCards = ({ metrics }) => {
  return (
    <Grid container spacing={2} mb={3}>
      {/* جلسات اليوم النشطة */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Groups color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">جلسات نشطة</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {metrics.todayActiveSessions}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              اليوم
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* إجمالي جلسات اليوم */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Today color="info" sx={{ mr: 1 }} />
              <Typography variant="h6">إجمالي الجلسات</Typography>
            </Box>
            <Typography variant="h4" color="info.main">
              {metrics.todaySessions}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              اليوم
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* ساعات اليوم */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTime color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">ساعات اليوم</Typography>
            </Box>
            <Typography variant="h4" color="warning.main">
              {metrics.todayHours}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              إجمالي الساعات
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* إيرادات اليوم */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AttachMoney color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">إيرادات اليوم</Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {formatCurrency(metrics.todayRevenue)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              الإيراد الكلي
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default MetricsCards;