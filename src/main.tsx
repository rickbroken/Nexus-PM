import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/theme.css';
import './lib/swal-config'; // Configurar SweetAlert2 antes de renderizar

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);