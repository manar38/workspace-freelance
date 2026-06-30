// src/components/Navbar.jsx
import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton
} from '@mui/material';
import { ArrowBack, Dashboard, Home, Logout } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, userRole } = useAuth();

  console.log('Navbar Debug:', { user, userRole, isAdmin: isAdmin(), hasUser: !!user });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleBack = () => {
    if (location.pathname === '/dashboard') {
      navigate('/home');
    } else {
      navigate(-1);
    }
  };

  return (
    <AppBar position="static" sx={{ bgcolor: '#036d80' }} dir="ltr">
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* اليسار: زر الرجوع + العنوان */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton color="inherit" onClick={handleBack}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div">
            Workspace Entry App
          </Typography>
        </Box>

        {/* اليمين: الأزرار */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {user && (
            <>
              <Button
                color="inherit"
                startIcon={<Home />}
                onClick={() => navigate('/home')}
                sx={{ textTransform: 'none' }}
              >
                Home
              </Button>

              {isAdmin() && (
                <Button
                  color="inherit"
                  startIcon={<Dashboard />}
                  onClick={() => navigate('/dashboard')}
                  sx={{ textTransform: 'none' }}
                >
                  Dashboard
                </Button>
              )}

              <Button
                color="inherit"
                startIcon={<Logout />}
                onClick={handleLogout}
                sx={{ textTransform: 'none' }}
              >
                Logout
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;