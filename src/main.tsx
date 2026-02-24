import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { DatabaseProvider } from './contexts/DatabaseContext';

import { SettingsProvider } from './contexts/SettingsContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DatabaseProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </DatabaseProvider>
  </React.StrictMode>
);