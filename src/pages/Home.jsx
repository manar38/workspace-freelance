import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Grid,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { CheckCircle, Person, Phone, LocationOn, School } from '@mui/icons-material';
import { db } from '../utils/firebase';
import { collection, addDoc, onSnapshot, updateDoc, doc, query, where } from 'firebase/firestore';
import Timer from '../components/Timer';
import Navbar from '../components/Navbar';

const Home = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    city: '',
    studyYear: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    // Listen for active sessions (not finished)
    const q = query(
      collection(db, 'sessions'),
      where('finished', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActiveSessions(sessions);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const sessionData = {
        ...formData,
        startTime: new Date().toISOString(),
        finished: false,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'sessions'), sessionData);
      
      setSuccess('Student session started successfully!');
      setFormData({
        fullName: '',
        phoneNumber: '',
        city: '',
        studyYear: ''
      });
    } catch (error) {
      setError('Failed to start session. Please try again.');
      console.error('Error adding session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSession = async (sessionId, startTime) => {
    try {
      const endTime = new Date().toISOString();
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationHours = (end - start) / (1000 * 60 * 60);
      const totalCost = Math.round(durationHours * 20 * 100) / 100; // 20 EGP per hour

      await updateDoc(doc(db, 'sessions', sessionId), {
        endTime,
        finished: true,
        duration: durationHours.toFixed(2),
        totalCost
      });

      setSuccess('Session finished successfully!');
    } catch (error) {
      setError('Failed to finish session. Please try again.');
      console.error('Error finishing session:', error);
    }
  };

  const columns = [
    { field: 'fullName', headerName: 'Full Name', width: 200 },
    { field: 'phoneNumber', headerName: 'Phone', width: 150 },
    { field: 'city', headerName: 'City', width: 120 },
    { field: 'studyYear', headerName: 'Study Year', width: 120 },
    {
      field: 'duration',
      headerName: 'Duration',
      width: 120,
      renderCell: (params) => (
        <Timer startTime={params.row.startTime} finished={params.row.finished} />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params) => (
        <IconButton
          color="success"
          onClick={() => handleFinishSession(params.row.id, params.row.startTime)}
          disabled={params.row.finished}
        >
          <CheckCircle />
        </IconButton>
      )
    }
  ];

  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Form Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Add New Student Session
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="fullName"
                  label="Full Name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="phoneNumber"
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="city"
                  label="City"
                  value={formData.city}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="studyYear"
                  label="Study Year"
                  value={formData.studyYear}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <School sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {loading ? 'Starting Session...' : 'Start Session'}
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Stats Section */}
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Sessions
                </Typography>
                <Typography variant="h2" color="primary" gutterBottom>
                  {activeSessions.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Students currently in session
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Active Sessions Table */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Current Active Sessions
              </Typography>
              <Box sx={{ height: 400, width: '100%' }}>
                <DataGrid
                  rows={activeSessions}
                  columns={columns}
                  pageSize={5}
                  rowsPerPageOptions={[5, 10, 20]}
                  disableSelectionOnClick
                  sx={{
                    '& .MuiDataGrid-root': {
                      border: 'none'
                    }
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
};

export default Home;