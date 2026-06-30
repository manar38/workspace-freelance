// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../utils/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth State Changed:', firebaseUser);
      
      if (firebaseUser) {
        // التحقق من الإيميل مباشرة
        const userEmail = firebaseUser.email;
        let role = 'user'; // القيمة الافتراضية
        
        // إذا الإيميل admin@demo.com يبقى admin
        if (userEmail === 'admin@demo.com') {
          role = 'admin';
        }
        // يمكنك إضافة المزيد من الإيميلات هنا لو عايزة
        // else if (userEmail === 'manager@demo.com') {
        //   role = 'manager';
        // }
        
        console.log('📧 User Email:', userEmail);
        console.log('👑 Assigned Role:', role);
        
        setUser({
          uid: firebaseUser.uid,
          email: userEmail,
          role: role
        });
        setUserRole(role);
      } else {
        console.log('🚪 No user logged in');
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    console.log('🔑 Attempting login for:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Login successful:', userCredential.user.email);
    return userCredential;
  };

  const logout = async () => {
    console.log('🚪 Logging out');
    await signOut(auth);
  };

  const isAdmin = () => {
    console.log('👑 Checking admin role:', userRole);
    return userRole === 'admin';
  };

  const value = {
    user,
    userRole,
    login,
    logout,
    isAdmin,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};