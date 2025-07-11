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
  const { user, logout, isAdmin } = useAuth();

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
    <AppBar position="static" sx={{ backgroundColor: '#2196f3' }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="back"
          onClick={handleBack}
          sx={{ mr: 2 }}
        >
          <ArrowBack />
        </IconButton>
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Workspace Entry App
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {user && (
            <>
              <Button
                color="inherit"
                startIcon={<Home />}
                onClick={() => navigate('/home')}
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              >
                Home
              </Button>
              
              {isAdmin() && (
                <Button
                  color="inherit"
                  startIcon={<Dashboard />}
                  onClick={() => navigate('/dashboard')}
                  sx={{ display: { xs: 'none', sm: 'flex' } }}
                >
                  Dashboard
                </Button>
              )}
              
              <Button
                color="inherit"
                startIcon={<Logout />}
                onClick={handleLogout}
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