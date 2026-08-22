import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Services from '@/pages/Services';
import Professionals from '@/pages/Professionals';
import Profile from '@/pages/Profile';
import About from '@/pages/About';
import Admin from '@/pages/Admin';
import Dashboard from '@/pages/Dashboard';
import MyBookings from '@/pages/MyBookings';
import Favourites from '@/pages/Favourites';
import Messages from '@/pages/Messages';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import ForgotPassword from '@/pages/ForgotPassword';
import NotFound from '@/pages/NotFound';
import { AuthProvider } from '@/context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/professionals" element={<Professionals />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/about" element={<About />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/favourites" element={<Favourites />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}
