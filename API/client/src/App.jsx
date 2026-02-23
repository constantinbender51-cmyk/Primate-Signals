// client/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Main from './Main';
import Signup from './signup';
import Verification from './verification';
import Subscription from './subscription';
import Chat from './chat';
import Record from './record';
import Terminal from './terminal';
import Login from './login';

function App() {
  // Check if user is logged in
  const isAuthenticated = () => {
    return !!localStorage.getItem('user');
  };
  
  // Check if user is a client with active subscription
  const isClient = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    
    const user = JSON.parse(userStr);
    return user.role === 'client' && 
           user.subscription && 
           user.subscription.status === 'active';
  };
  
  // Check if user is a worker and verified
  const isWorker = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    
    const user = JSON.parse(userStr);
    return user.role === 'worker' && user.is_verified;
  };

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Main />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Client routes */}
        <Route path="/subscription" element={
          isAuthenticated() && !isClient() 
            ? <Subscription /> 
            : <Navigate to={isClient() ? "/chat" : "/"} />
        } />
        <Route path="/chat" element={
          isClient() ? <Chat /> : <Navigate to="/subscription" />
        } />
        
        {/* Worker routes */}
        <Route path="/verification" element={
          isAuthenticated() && !isWorker() 
            ? <Verification /> 
            : <Navigate to={isWorker() ? "/terminal" : "/"} />
        } />
        <Route path="/record" element={
          isWorker() ? <Record /> : <Navigate to="/verification" />
        } />
        <Route path="/terminal" element={
          isWorker() ? <Terminal /> : <Navigate to="/verification" />
        } />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;