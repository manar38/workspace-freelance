// src/components/StudentForm.jsx
import React, { useState } from 'react'
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Grid,
  MenuItem
} from '@mui/material'
import { PersonAdd, Send } from '@mui/icons-material'

const StudentForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    city: '',
    studyYear: ''
  })
  const [error, setError] = useState('')

  const studyYears = [
    { value: '1', label: 'Year 1' },
    { value: '2', label: 'Year 2' },
    { value: '3', label: 'Year 3' },
    { value: '4', label: 'Year 4' },
    { value: '5', label: 'Year 5' },
    { value: 'graduate', label: 'Graduate' },
    { value: 'other', label: 'Other' }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.fullName.trim()) {
      setError('Please enter the student\'s full name')
      return
    }
    if (!formData.phoneNumber.trim()) {
      setError('Please enter the phone number')
      return
    }
    if (!formData.city.trim()) {
      setError('Please enter the city')
      return
    }
    if (!formData.studyYear) {
      setError('Please select the study year')
      return
    }

    // Phone number validation (Egyptian format)
    const phoneRegex = /^(\+20|0)?1[0-2,5]\d{8}$/
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
      setError('Please enter a valid Egyptian phone number')
      return
    }

    try {
      await onSubmit(formData)
      // Reset form after successful submission
      setFormData({
        fullName: '',
        phoneNumber: '',
        city: '',
        studyYear: ''
      })
    } catch (error) {
      setError('Failed to add student. Please try again.')
      console.error('Form submission error:', error)
    }
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <PersonAdd color="primary" sx={{ fontSize: 30 }} />
        <Typography variant="h5" component="h2" fontWeight="bold">
          Add New Student
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="fullName"
              label="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter student's full name"
              required
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="phoneNumber"
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="01234567890"
              required
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              name="city"
              label="City"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter city name"
              required
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              name="studyYear"
              label="Study Year"
              value={formData.studyYear}
              onChange={handleChange}
              required
              disabled={loading}
            >
              {studyYears.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<Send />}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? 'Adding Student...' : 'Start Session'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  )
}

export default StudentForm