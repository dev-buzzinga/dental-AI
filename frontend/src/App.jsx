import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import VoipWidget from './components/VoipWidget/VoipWidget';
import { ToastProvider } from './components/Toast/Toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';

// Pages
import CallsPage from './pages/Calls';
import SMSPage from './pages/SMS';
import PatientsPage from './pages/Patients/index';
import DoctorsPage from './pages/Doctors/index';
import DoctorDetails from './pages/Doctors/DoctorDetails';
import PatientDetail from './pages/Patients/PatientDetail';
import AddNumberPage from './pages/Settings/AddNumberPage';
import AppointmentTypes from './pages/Settings/AppointmentTypes';
import Login from './pages/auth/login';
import Signup from './pages/auth/signup';

const CalendarPlaceholder = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
    <div style={{ textAlign: 'center' }}>
      <i className="fas fa-calendar-days" style={{ fontSize: 48, color: '#D1D5DB', marginBottom: 16 }} />
      <h2 style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>Calendar</h2>
      <p style={{ fontSize: 14 }}>Calendar view coming soon</p>
    </div>
  </div>
);


const AppContent = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={
        <GuestRoute>
          <Login key="login-page" />
        </GuestRoute>
      } />
      <Route path="/signup" element={
        <GuestRoute>
          <Signup key="signup-page" />
        </GuestRoute>
      } />

      {/* Protected App Routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <div className="app-layout">
            <Sidebar />
            <div className="app-content">
              <Routes>
                <Route path="/" element={<Navigate to="/calls" replace />} />
                <Route path="/calls" element={<CallsPage />} />
                <Route path="/sms" element={<SMSPage />} />
                <Route path="/calendar" element={<CalendarPlaceholder />} />
                <Route path="/patients/:id" element={<PatientDetail />} />
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/settings/doctors/:id" element={<DoctorDetails />} />
                <Route path="/settings/doctors" element={<DoctorsPage />} />
                <Route path="/settings/appointment-types" element={<AppointmentTypes />} />
                <Route path="/settings/add-number" element={<AddNumberPage />} />
                <Route path="*" element={<Navigate to="/calls" replace />} />
              </Routes>
            </div>
            <VoipWidget />
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
