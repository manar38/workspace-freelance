import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';

const Timer = ({ startTime, finished = false }) => {
  const [duration, setDuration] = useState('00:00:00');

  useEffect(() => {
    if (finished) return;

    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(startTime);
      const diff = now - start;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setDuration(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, finished]);

  useEffect(() => {
    if (finished) {
      const start = new Date(startTime);
      const end = new Date();
      const diff = end - start;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setDuration(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }
  }, [startTime, finished]);

  return (
    <Typography variant="body2" color={finished ? 'text.secondary' : 'primary'}>
      {duration}
    </Typography>
  );
};

export default Timer;