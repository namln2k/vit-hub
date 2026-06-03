import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { preconnectToOrigin } from '@/utils/resourceHints';
import './index.css';
import App from '@/App';

preconnectToOrigin(import.meta.env.VITE_R2_PUBLIC_BASE_URL);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
