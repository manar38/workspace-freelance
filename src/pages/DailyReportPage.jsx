// src/pages/DailyReportPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Box, Typography, IconButton, CircularProgress, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import DailyReportView from '../components/Daily ReportView';
import Navbar from '../components/Navbar';

const DailyReportPage = () => {
  const { date } = useParams();
  const navigate = useNavigate();
  const [basicPrice, setBasicPrice] = useState(15);
  const [drinksPrice, setDrinksPrice] = useState(20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const pricingRef = doc(db, 'settings', 'pricing');
        const snap = await getDoc(pricingRef);
        if (snap.exists()) {
          const data = snap.data();
          setBasicPrice(data.basicPrice || 15);
          setDrinksPrice(data.drinksPrice || 20);
        }
      } catch (err) {
        console.error('Error fetching pricing:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" dir="rtl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <IconButton onClick={() => navigate('/dashboard')} color="primary">
            <ArrowBack />
          </IconButton>
          <Typography variant="h5">
            تقرير يوم {new Date(date).toLocaleDateString('ar-EG')}
          </Typography>
        </Box>

        <DailyReportView 
          selectedDate={date} 
          basicPrice={basicPrice} 
          drinksPrice={drinksPrice} 
        />
      </Container>
    </Box>
  );
};

export default DailyReportPage;