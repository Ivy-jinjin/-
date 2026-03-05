import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import MotionCapture from './components/MotionCapture';
import AdminDashboard from './components/AdminDashboard';
import HealthDataInput from './app/health-data/page';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/health-data" element={<HealthDataInput />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/motion-capture" element={<MotionCapture />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App; 