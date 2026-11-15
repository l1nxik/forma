import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { isMac } from './design/platform';
import './design/tokens.css';
import './design/app.css';
document.documentElement.dataset.platform = isMac ? 'macos' : 'other';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
