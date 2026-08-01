import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { store } from './store'
import AppRoutes from './routes/AppRoutes.tsx'
import PWAInstallBanner from './components/PWAInstallBanner'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import { ThemeProvider } from './contexts/ThemeContext'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import './index.css'

function NetworkWatcher() {
  useNetworkStatus();
  return null;
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <NetworkWatcher />
        <AppRoutes />
        <PWAInstallBanner />
        <PWAUpdatePrompt />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', fontSize: '14px' },
            success: { iconTheme: { primary: '#2563eb', secondary: '#fff' } },
          }}
        />
      </ThemeProvider>
    </Provider>
  )
}

export default App
