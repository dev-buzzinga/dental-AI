import { Route } from 'react-router-dom';
import GuestRoute from '../components/auth/GuestRoute';
import Login from '../pages/auth/login';
import Signup from '../pages/auth/signup';
import SchedulerPage from '../pages/Scheduler';

/**
 * Routes that do not require authentication (no ProtectedRoute).
 * Additional public paths can be added here.
 */
export const publicRoutes = [
  <Route
    key="login"
    path="/login"
    element={
      <GuestRoute>
        <Login key="login-page" />
      </GuestRoute>
    }
  />,
  <Route
    key="signup"
    path="/signup"
    element={
      <GuestRoute>
        <Signup key="signup-page" />
      </GuestRoute>
    }
  />,
  <Route key="public-scheduler" path="/public-scheduler" element={<SchedulerPage />} />,
];
