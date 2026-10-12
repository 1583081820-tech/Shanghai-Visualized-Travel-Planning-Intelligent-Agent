import './index.css'; // ✅ 必须有这行，否则所有 Tailwind 样式和自定义动画都不生效
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);