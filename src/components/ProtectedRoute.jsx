// src/components/common/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAdmin, loading } = useAuth();

  console.log('🛡️ ProtectedRoute Check:', { 
    user: user?.email, 
    isAdmin: isAdmin(), 
    adminOnly,
    loading 
  });

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          جاري التحميل...
        </Typography>
      </Box>
    );
  }

  if (!user) {
    console.log('🚫 No user - redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    console.log('⛔ User is not admin - redirecting to home');
    return <Navigate to="/home" replace />;
  }

  console.log('✅ Access granted');
  return children;
};

export default ProtectedRoute;