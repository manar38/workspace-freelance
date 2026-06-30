import React, { useState, useEffect } from 'react';
import {
  Paper, TextField, Button, Typography, Box, Alert,
  Radio, RadioGroup, FormControlLabel, List, ListItem, ListItemText
} from '@mui/material';
import { Person, Phone, LocationOn, School } from '@mui/icons-material';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { addDoc } from 'firebase/firestore';

const ClientForm = ({ onError, onSuccess, onSessionAdded }) => {
  const [formData, setFormData] = useState({ 
    fullName: '', 
    phoneNumber: '', 
    city: '', 
    studyYear: '' 
  });
  const [sessionType, setSessionType] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [previousClients, setPreviousClients] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // استرجاع العملاء السابقين
  useEffect(() => {
    const fetchPreviousClients = async () => {
      try {
        const q = query(collection(db, 'sessions'));
        const querySnapshot = await getDocs(q);
        
        const clientsMap = new Map();
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.fullName && data.fullName !== "----") {
            clientsMap.set(data.fullName, {
              fullName: data.fullName,
              phoneNumber: data.phoneNumber,
              city: data.city,
              studyYear: data.studyYear
            });
          }
        });
        
        setPreviousClients(Array.from(clientsMap.values()));
      } catch (err) {
        console.error('Error fetching previous clients:', err);
      }
    };
    
    fetchPreviousClients();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'fullName') {
      setShowSuggestions(value.length > 1);
    }
  };

  const selectClient = (client) => {
    setFormData({
      fullName: client.fullName,
      phoneNumber: client.phoneNumber,
      city: client.city,
      studyYear: client.studyYear
    });
    setShowSuggestions(false);
  };

  const filteredSuggestions = previousClients.filter(client =>
    client.fullName.toLowerCase().includes(formData.fullName.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const startNow = new Date().toISOString();
    const newSession = {
      fullName: formData.fullName,
      phoneNumber: formData.phoneNumber,
      city: formData.city,
      studyYear: formData.studyYear,
      sessionType,
      startTime: startNow,
      finished: false,
      orders: [],
    };

    try {
      setLoading(true);
      await addDoc(collection(db, 'sessions'), newSession);
      onSuccess('تم بدء الجلسة بنجاح ✅');
      setFormData({
        fullName: "",
        phoneNumber: "",
        city: "",
        studyYear: "",
      });
      if (onSessionAdded) onSessionAdded();
    } catch (err) {
      console.error('Error starting session:', err);
      onError('حدث خطأ أثناء بدء الجلسة ❌');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, position: 'relative' }}>
      <Typography variant="h5" gutterBottom>بدء جلسة طالب جديد</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <TextField 
          fullWidth 
          name="fullName" 
          label="الاسم الكامل" 
          value={formData.fullName} 
          onChange={handleInputChange}
          margin="normal" 
          required 
          InputProps={{ startAdornment: <Person sx={{ mr: 1, color: '#ee9217' }} /> }} 
        />

        {/* قائمة الاقتراحات */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <Paper sx={{ 
            position: 'absolute', 
            zIndex: 1000, 
            width: 'calc(100% - 48px)', 
            maxHeight: 200, 
            overflow: 'auto',
            mt: -1
          }}>
            <List>
              {filteredSuggestions.map((client, index) => (
                <ListItem 
                  key={index} 
                  button 
                  onClick={() => selectClient(client)}
                >
                  <ListItemText 
                    primary={client.fullName}
                    secondary={`${client.phoneNumber} - ${client.city} - ${client.studyYear}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        <TextField fullWidth name="phoneNumber" label="رقم الهاتف" value={formData.phoneNumber} onChange={handleInputChange} margin="normal" required InputProps={{ startAdornment: <Phone sx={{ mr: 1, color: '#ee9217' }} /> }} />
        <TextField fullWidth name="city" label="البلد" value={formData.city} onChange={handleInputChange} margin="normal" required InputProps={{ startAdornment: <LocationOn sx={{ mr: 1, color: '#ee9217' }} /> }} />
        <TextField fullWidth name="studyYear" label="السنة الدراسية" value={formData.studyYear} onChange={handleInputChange} margin="normal" required InputProps={{ startAdornment: <School sx={{ mr: 1, color: '#ee9217' }} /> }} />

        <Typography sx={{ mt: 2 }}>نوع الجلسة:</Typography>
        <RadioGroup row value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
          <FormControlLabel value="basic" control={<Radio />} label="بدون مشروبات" />
          <FormControlLabel value="drinks" control={<Radio />} label="مع مشروبات" />
        </RadioGroup>

        <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 3, mb: 2 }}>
          {loading ? 'جاري بدء الجلسة...' : 'بدء الجلسة'}
        </Button>
      </Box>
    </Paper>
  );
};

export default ClientForm;