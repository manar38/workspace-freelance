// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react'
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Alert
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People,
  Schedule,
  AttachMoney,
  AccessTime,
  Search,
  CheckCircle,
  PendingActions
} from '@mui/icons-material'
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore'
import { db } from '../utils/firebase'
import Navbar from '../components/Navbar'
import Timer from '../components/Timer'

const Dashboard = () => {
  const [sessions, setSessions] = useState([])
  const [filteredSessions, setFilteredSessions] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Real-time listener for all sessions
  useEffect(() => {
    const q = query(
      collection(db, 'sessions'),
      orderBy('startTime', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const sessionsData = []
        snapshot.forEach((doc) => {
          sessionsData.push({
            id: doc.id,
            ...doc.data(),
            startTime: doc.data().startTime?.toDate?.() || new Date(doc.data().startTime),
            endTime: doc.data().endTime?.toDate?.() || doc.data().endTime
          })
        })
        setSessions(sessionsData)
        setFilteredSessions(sessionsData)
        setLoading(false)
      } catch (err) {
        console.error('Error processing sessions:', err)
        setError('Failed to load sessions')
        setLoading(false)
      }
    }, (err) => {
      console.error('Error fetching sessions:', err)
      setError('Failed to connect to database')
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Filter sessions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions)
    } else {
      const filtered = sessions.filter(session =>
        session.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.phoneNumber.includes(searchQuery) ||
        session.city.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredSessions(filtered)
    }
  }, [searchQuery, sessions])

  // Calculate metrics
  const calculateMetrics = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const activeSessions = sessions.filter(s => !s.finished)
    
    const thisMonthSessions = sessions.filter(s => {
      const sessionDate = new Date(s.startTime)
      return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear
    })

    const totalHours = thisMonthSessions.reduce((total, session) => {
      if (session.finished && session.endTime) {
        const hours = (new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60 * 60)
        return total + hours
      }
      return total
    }, 0)

    const totalRevenue = thisMonthSessions.reduce((total, session) => {
      return total + (session.totalCost || 0)
    }, 0)

    return {
      activeSessions: activeSessions.length,
      totalSessions: sessions.length,
      monthlyHours: totalHours,
      monthlyRevenue: totalRevenue,
      finishedSessions: sessions.filter(s => s.finished).length
    }
  }

  const metrics = calculateMetrics()

  const formatCurrency = (amount) => {
    return `${amount.toFixed(2)} EGP`
  }

  const formatDuration = (startTime, endTime) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.floor((end - start) / 1000)
    
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = duration % 60

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const calculateCurrentCost = (startTime) => {
    const now = new Date()
    const start = new Date(startTime)
    const hours = (now - start) / (1000 * 60 * 60)
    return hours * 20
  }

  if (loading) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <Typography>Loading dashboard...</Typography>
          </Box>
        </Container>
      </Box>
    )
  }

  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg">
        <Box py={2}>
          {/* Header */}
          <Box display="flex" alignItems="center" gap={2} mb={4}>
            <DashboardIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              Admin Dashboard
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Metrics Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <PendingActions color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {metrics.activeSessions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Sessions
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <People color="success" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {metrics.totalSessions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Sessions
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <AccessTime color="warning" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {metrics.monthlyHours.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Hours This Month
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <AttachMoney color="error" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {formatCurrency(metrics.monthlyRevenue)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Monthly Revenue
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Sessions Table */}
          <Paper elevation={3}>
            <Box p={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                  All Sessions
                </Typography>
                <TextField
                  size="small"
                  placeholder="Search by name, phone, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 300 }}
                />
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Student Name</strong></TableCell>
                      <TableCell><strong>Phone</strong></TableCell>
                      <TableCell><strong>City</strong></TableCell>
                      <TableCell><strong>Study Year</strong></TableCell>
                      <TableCell><strong>Start Time</strong></TableCell>
                      <TableCell><strong>Duration</strong></TableCell>
                      <TableCell><strong>Cost</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {session.fullName}
                          </Typography>
                        </TableCell>
                        <TableCell>{session.phoneNumber}</TableCell>
                        <TableCell>{session.city}</TableCell>
                        <TableCell>{session.studyYear}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {session.startTime.toLocaleDateString()}{' '}
                            {session.startTime.toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {session.finished ? (
                            <Typography variant="body2" fontFamily="monospace">
                              {formatDuration(session.startTime, session.endTime)}
                            </Typography>
                          ) : (
                            <Timer startTime={session.startTime} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {session.finished 
                              ? formatCurrency(session.totalCost || 0)
                              : formatCurrency(calculateCurrentCost(session.startTime))
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {session.finished ? (
                            <Chip
                              icon={<CheckCircle />}
                              label="Finished"
                              color="success"
                              variant="outlined"
                              size="small"
                            />
                          ) : (
                            <Chip
                              icon={<Schedule />}
                              label="Active"
                              color="primary"
                              variant="outlined"
                              size="small"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {filteredSessions.length === 0 && (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    {searchQuery ? 'No sessions found matching your search.' : 'No sessions available.'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}

export default Dashboard