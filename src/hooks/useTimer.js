import { useState, useEffect } from 'react'

export function useTimer(startTime, isActive = true) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!isActive || !startTime) return

    const updateTimer = () => {
      const now = new Date()
      const start = new Date(startTime)
      const diff = Math.floor((now - start) / 1000)
      setSeconds(diff)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [startTime, isActive])

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getHours = () => (seconds / 3600).toFixed(2)
  const getTotalCost = () => (parseFloat(getHours()) * 20).toFixed(2)

  return {
    seconds,
    formatted: formatTime(seconds),
    hours: getHours(),
    totalCost: getTotalCost()
  }
}