import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

const ActiveSessionsCard = ({ count }) => {
  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>الجلسات النشطة حاليًا</Typography>
        <Typography variant="h2" color="#ee9217" gutterBottom>{count}</Typography>
        <Typography variant="body2" color="text.secondary">عدد الطلاب داخل الجلسة الآن</Typography>
      </CardContent>
    </Card>
  );
};

export default ActiveSessionsCard;