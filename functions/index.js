const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.archiveDailySessions = functions.pubsub
  .schedule('59 23 * * *') // كل يوم الساعة 11:59 مساءً
  .timeZone('Africa/Cairo') // توقيت مصر
  .onRun(async (context) => {
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const startOfDay = new Date(dateString);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateString);
    endOfDay.setHours(23, 59, 59, 999);

    // تحقق من وجود أرشيف
    const archiveRef = db.collection('dailyArchives').doc(dateString);
    const archiveSnap = await archiveRef.get();
    if (archiveSnap.exists()) {
      console.log('Archive already exists for', dateString);
      return null;
    }

    // جلب الجلسات المنتهية
    const snapshot = await db.collection('sessions')
      .where('startTime', '>=', startOfDay.toISOString())
      .where('startTime', '<=', endOfDay.toISOString())
      .get();

    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const finished = sessions.filter(s => s.finished);

    // حساب الإحصائيات (نفس المنطق)
    const basic = finished.filter(s => s.sessionType === 'basic');
    const drinks = finished.filter(s => s.sessionType === 'drinks');
    const takeaway = finished.filter(s => s.sessionType === 'take away');

    const calc = (arr, type) => arr.reduce((sum, s) => {
      if (s.totalCost) return sum + Number(s.totalCost);
      const h = type !== 'take away' ? Math.ceil((new Date(s.endTime) - new Date(s.startTime)) / 3600000) : 0;
      const p = Number(s.pricePerHour || 0);
      const o = (s.orders || []).reduce((a, o) => a + Number(o.price || o.cost || 0), 0);
      return sum + (h * p + o);
    }, 0);

    const stats = {
      date: dateString,
      totalSessions: finished.length,
      totalRevenue: calc(basic, 'basic') + calc(drinks, 'drinks') + calc(takeaway, 'take away'),
      basicSessions: basic.length,
      basicRevenue: calc(basic, 'basic'),
      drinksSessions: drinks.length,
      drinksRevenue: calc(drinks, 'drinks'),
      takeawaySessions: takeaway.length,
      takeawayRevenue: calc(takeaway, 'take away'),
      sessions: finished.map(s => ({ id: s.id, ...s })),
      archivedAt: new Date().toISOString(),
      autoArchived: true
    };

    await archiveRef.set(stats);
    console.log('Auto-archived', dateString, stats.totalSessions, 'sessions');
    return null;
  });