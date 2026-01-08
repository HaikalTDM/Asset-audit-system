import React, { useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import StaffDashboard from './pages/Staff/Dashboard';
import StaffCapture from './pages/Staff/Capture';
import StaffAssess from './pages/Staff/Assess';
import StaffReview from './pages/Staff/Review';
import StaffHistory from './pages/Staff/History';
import StaffHistoryDetail from './pages/Staff/HistoryDetail';
import SyncStatus from './pages/Staff/SyncStatus';
import StaffSettings from './pages/Staff/Settings';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import AdminAllAssessments from './pages/Admin/AllAssessments';
import AdminSettings from './pages/Admin/Settings';
import NotFound from './pages/NotFound';
import { useOffline } from './lib/offline/network';
import ExampleModal from './pages/Modal';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function RequireRole({ role, children }: { role: 'admin' | 'staff'; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppShell() {
  const { user, signOut } = useAuth();
  const { pendingCount, isOnline } = useOffline();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!user) return null;

  const isActive = (path: string, exact = false) => {
    if (path === '/') return location.pathname === '/';
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="app-shell">
      <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title-block">
              <div className="sidebar-title">Condition Assessment</div>
            </div>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '>' : '<'}
            </button>
          </div>
          <div className="sidebar-nav">
            {user.role === 'admin' ? (
              <>
                <button className={`sidebar-link ${isActive('/admin', true) ? 'active' : ''}`} onClick={() => navigate('/admin')}>
                  <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                  Dashboard
                </button>
                <button className={`sidebar-link ${isActive('/admin/assessments') ? 'active' : ''}`} onClick={() => navigate('/admin/assessments')}>
                  <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h8" /></svg>
                  Assessments
                </button>
                <button className={`sidebar-link ${isActive('/admin/users') ? 'active' : ''}`} onClick={() => navigate('/admin/users')}>
                  <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 6.5-4 8-4s6.5 0 8 4" /></svg>
                  Users
                </button>
                <button className={`sidebar-link ${isActive('/admin/settings') ? 'active' : ''}`} onClick={() => navigate('/admin/settings')}>
                  <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" /></svg>
                  Settings
                </button>
              </>
            ) : (
              <>
                <button className={`sidebar-link ${isActive('/staff', true) ? 'active' : ''}`} onClick={() => navigate('/staff')}>
                  <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                  Home
                </button>
                <button className={`sidebar-link ${isActive('/staff/sync') ? 'active' : ''}`} onClick={() => navigate('/staff/sync')}>
                  <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 0 15 6.7" /><path d="M21 12a9 9 0 0 0-15-6.7" /><path d="M3 16v-4h4" /><path d="M21 8v4h-4" /></svg>
                  Sync
                </button>
                <button className={`sidebar-link ${isActive('/staff/capture') ? 'active' : ''}`} onClick={() => navigate('/staff/capture')}>
                  <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  Capture
                </button>
                <button className={`sidebar-link ${isActive('/staff/history') ? 'active' : ''}`} onClick={() => navigate('/staff/history')}>
                  <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></svg>
                  History
                </button>
                <button className={`sidebar-link ${isActive('/staff/settings') ? 'active' : ''}`} onClick={() => navigate('/staff/settings')}>
                  <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" /></svg>
                  Setting
                </button>
              </>
            )}
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-pill">{user.role === 'admin' ? 'Admin Portal' : 'Staff Portal'}</div>
            <button className="sidebar-link signout" onClick={signOut}>
              <span className="signout-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M10 4h6a2 2 0 0 1 2 2v4" />
                  <path d="M18 14v4a2 2 0 0 1-2 2h-6" />
                  <path d="M13 12H4" />
                  <path d="M7 9l-3 3 3 3" />
                </svg>
              </span>
              Sign Out
            </button>
          </div>
        </aside>
        <div className="container">
          <Outlet />
        </div>
      </div>
      <div className={`bottom-nav ${user.role === 'admin' ? 'admin' : 'staff'}`}>
        {user.role === 'admin' ? (
          <>
            <button className={`bottom-nav-item ${isActive('/admin', true) ? 'active' : ''}`} onClick={() => navigate('/admin')}>
              <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              <span>Home</span>
            </button>
            <button className={`bottom-nav-item ${isActive('/admin/assessments') ? 'active' : ''}`} onClick={() => navigate('/admin/assessments')}>
              <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h8" /></svg>
              <span>Assessment</span>
            </button>
            <button className={`bottom-nav-item ${isActive('/admin/users') ? 'active' : ''}`} onClick={() => navigate('/admin/users')}>
              <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 6.5-4 8-4s6.5 0 8 4" /></svg>
              <span>User</span>
            </button>
            <button className={`bottom-nav-item ${isActive('/admin/settings') ? 'active' : ''}`} onClick={() => navigate('/admin/settings')}>
              <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" /></svg>
              <span>Setting</span>
            </button>
          </>
        ) : (
          <>
            <button className={`bottom-nav-item ${isActive('/staff', true) ? 'active' : ''}`} onClick={() => navigate('/staff')}>
              <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              <span>Home</span>
            </button>
            <button className={`bottom-nav-item ${isActive('/staff/sync') ? 'active' : ''}`} onClick={() => navigate('/staff/sync')}>
              <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 0 15 6.7" /><path d="M21 12a9 9 0 0 0-15-6.7" /><path d="M3 16v-4h4" /><path d="M21 8v4h-4" /></svg>
              <span>Sync</span>
            </button>
            <button className={`fab ${isActive('/staff/capture') ? 'active' : ''}`} onClick={() => navigate('/staff/capture')} aria-label="Capture">
              <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <button className={`bottom-nav-item ${isActive('/staff/history') ? 'active' : ''}`} onClick={() => navigate('/staff/history')}>
              <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></svg>
              <span>History</span>
            </button>
            <button className={`bottom-nav-item ${isActive('/staff/settings') ? 'active' : ''}`} onClick={() => navigate('/staff/settings')}>
              <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V21a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V3a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H21a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" /></svg>
              <span>Setting</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/staff" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />

        <Route path="staff" element={<RequireRole role="staff"><Outlet /></RequireRole>}>
          <Route index element={<StaffDashboard />} />
          <Route path="capture" element={<StaffCapture />} />
          <Route path="assess" element={<StaffAssess />} />
          <Route path="review" element={<StaffReview />} />
          <Route path="history" element={<StaffHistory />} />
          <Route path="history/:id" element={<StaffHistoryDetail />} />
          <Route path="sync" element={<SyncStatus />} />
          <Route path="settings" element={<StaffSettings />} />
        </Route>

        <Route path="history/:id" element={<StaffHistoryDetail />} />
        <Route path="modal" element={<ExampleModal />} />

        <Route path="admin" element={<RequireRole role="admin"><Outlet /></RequireRole>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="assessments" element={<AdminAllAssessments />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
