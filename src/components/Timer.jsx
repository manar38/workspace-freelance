import React, { useEffect, useState } from "react";

const Timer = ({ startTime, finished, endTime }) => {
  const [displayTime, setDisplayTime] = useState("00:00:00");

  useEffect(() => {
    if (!startTime) {
      setDisplayTime("00:00:00");
      return;
    }

    const calculateTime = () => {
      try {
        const start = new Date(startTime);
        const now = new Date();
        
        let diff = now - start;
        
       

        // إذا الفرق سالب (الوقت لسة مجاش) وكان بيكون 00:00:00
        if (diff < 0) {
          // أنقص ساعة من وقت البداية علشان نبدأ العد
          const adjustedStart = new Date(start);
          adjustedStart.setHours(adjustedStart.getHours() - 1);
          
          diff = now - adjustedStart;
          
          // إذا لسة بعد التعديل الفرق سالب، ارجعي لـ 00:00:00
          if (diff < 0) {
            setDisplayTime("00:00:00");
            return;
          }
        }

        // إذا الجلسة منتهية، استخدم وقت النهاية
        if (finished && endTime) {
          const end = new Date(endTime);
          diff = end - start;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        
        setDisplayTime(timeString);
        
      } catch (error) {
        console.error('❌ Timer error:', error);
        setDisplayTime("00:00:00");
      }
    };

    calculateTime();
    
    if (!finished) {
      const interval = setInterval(calculateTime, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, finished, endTime]);

  return <span>{displayTime}</span>;
};

export default Timer;