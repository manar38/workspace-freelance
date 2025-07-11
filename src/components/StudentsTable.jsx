// src/components/StudentTable.jsx
import React from 'react'
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Box,
  Chip,
  Alert
} from '@mui/material'
import { CheckCircle, Schedule, Stop } from '@mui/icons-material'
import Timer from './Timer'

const StudentTable = ({ students, onFinishSession, loading }) => {
  const formatCurrency = (amount) => {
    return `${amount.toFixed(2)} EGP`
  }

  const calculateCurrentCost = (startTime) => {
    const now = new Date()
    const start = new Date(startTime)
    const hours = (now - start) / (1000 * 60 * 60)
    return hours * 20
  }

  if (students.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box textAlign="center" py={4}>
          <Schedule sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No active sessions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add a student to start tracking sessions
          </Typography>
        </Box>
      </Paper>
    )
  }

  return (
    <Paper elevation={3} sx={{ mb: 3 }}>
      <Box p={3} pb={0}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Schedule color="primary" sx={{ fontSize: 30 }} />
          <Typography variant="h5" component="h2" fontWeight="bold">
            Active Sessions
          </Typography>
          <Chip 
            label={`${students.filter(s => !s.finished).length} Active`}
            color="primary"
            variant="outlined"
          />
        </Box>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Student Name</strong></TableCell>
              <TableCell><strong>Phone</strong></TableCell>
              <TableCell><strong>City</strong></TableCell>
              <TableCell><strong>Study Year</strong></TableCell>
              <TableCell><strong>Duration</strong></TableCell>
              <TableCell><strong>Current Cost</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {student.fullName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {student.phoneNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {student.city}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {student.studyYear}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Timer 
                    startTime={student.startTime} 
                    finished={student.finished}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {student.finished 
                      ? formatCurrency(student.totalCost || 0)
                      : formatCurrency(calculateCurrentCost(student.startTime))
                    }
                  </Typography>
                </TableCell>
                <TableCell>
                  {student.finished ? (
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
                <TableCell>
                  {!student.finished && (
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      startIcon={<Stop />}
                      onClick={() => onFinishSession(student.id)}
                      disabled={loading}
                    >
                      Finish
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

export default StudentTable