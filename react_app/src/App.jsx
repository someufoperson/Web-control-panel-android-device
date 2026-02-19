import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout/Layout';
import DevicesPage from './pages/DevicesPage';
import CreateDevicePage from './pages/CreateDevicePage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { GlobalStyle } from './globalStyles';

function App() {
  return (
    <BrowserRouter>
      <GlobalStyle />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e2428',
            color: '#fff',
            border: '1px solid #3a4a52',
          },
          success: {
            iconTheme: {
              primary: '#2b6e5c',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#b33e3e',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Публичный маршрут — страница входа */}
        <Route path="/" element={<LoginPage />} />

        {/* Защищённые маршруты */}
        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DevicesPage />} />
        </Route>
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CreateDevicePage />} />
        </Route>

        {/* Если пользователь уже авторизован и заходит на /login, редирект на /devices */}
        <Route
          path="/login"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;