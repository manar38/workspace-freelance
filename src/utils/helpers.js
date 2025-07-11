// src/utils/helpers.js

/**
 * Format time duration from seconds to HH:MM:SS
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Calculate elapsed time between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date (optional, defaults to now)
 * @returns {number} Elapsed time in seconds
 */
export const calculateElapsedTime = (startDate, endDate = new Date()) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.floor((end - start) / 1000)
}

/**
 * Calculate cost based on duration and hourly rate
 * @param {number} hours - Duration in hours
 * @param {number} rate - Hourly rate (default: 20 EGP)
 * @returns {number} Total cost
 */
export const calculateCost = (hours, rate = 20) => {
  return Math.round(hours * rate * 100) / 100
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol (default: EGP)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'EGP') => {
  return `${amount.toFixed(2)} ${currency}`
}

/**
 * Validate Egyptian phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid
 */
export const validateEgyptianPhone = (phoneNumber) => {
  const cleanNumber = phoneNumber.replace(/\s/g, '')
  const phoneRegex = /^(\+20|0)?1[0-2,5]\d{8}$/
  return phoneRegex.test(cleanNumber)
}

/**
 * Format phone number for display
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  return phoneNumber
}

/**
 * Get current month name
 * @returns {string} Current month name
 */
export const getCurrentMonthName = () => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[new Date().getMonth()]
}

/**
 * Check if a date is in the current month
 * @param {Date} date - Date to check
 * @returns {boolean} True if in current month
 */
export const isCurrentMonth = (date) => {
  const now = new Date()
  const checkDate = new Date(date)
  return now.getMonth() === checkDate.getMonth() && now.getFullYear() === checkDate.getFullYear()
}

/**
 * Get time color based on duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Color code for MUI components
 */
export const getTimeColor = (seconds) => {
  if (seconds < 3600) return 'success' // Less than 1 hour - green
  if (seconds < 7200) return 'warning' // Less than 2 hours - orange
  return 'error' // More than 2 hours - red
}

/**
 * Generate unique session ID
 * @returns {string} Unique session ID
 */
export const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * Debounce function for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

/**
 * Local storage helpers
 */
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return null
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Error writing to localStorage:', error)
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Error removing from localStorage:', error)
    }
  }
}

/**
 * Error handling helper
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (error.code) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'User not found. Please check your email.'
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.'
      case 'auth/invalid-email':
        return 'Invalid email address.'
      case 'auth/user-disabled':
        return 'This account has been disabled.'
      case 'auth/too-many-requests':
        return 'Too many login attempts. Please try again later.'
      default:
        return 'An error occurred. Please try again.'
    }
  } else {
    return 'An error occurred. Please try again.'
  }
}