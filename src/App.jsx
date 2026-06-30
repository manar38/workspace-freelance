// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import DailyReportPage from './pages/DailyReportPage'; // تأكدي من المسار

const theme = createTheme({
  direction: 'rtl', // مهم جدًا للعربي
  palette: {
    primary: {
      main: '#036d80',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Tajawal", "Roboto", "Helvetica", "Arial", sans-serif', // خط عربي أجمل
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          direction: 'rtl',
          textAlign: 'right',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* الصفحة الرئيسية */}
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* تسجيل الدخول */}
            <Route path="/login" element={<Login />} />

            {/* الصفحة الرئيسية (للمستخدمين العاديين) */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            {/* لوحة التحكم (للمشرفين فقط) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute adminOnly>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* تقرير يومي (للمشرفين فقط) */}
            <Route
              path="/report/:date"
              element={
                <ProtectedRoute adminOnly>
                  <DailyReportPage />
                </ProtectedRoute>
              }
            />

            {/* صفحة 404 */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;