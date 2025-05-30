// main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

console.log("MAIN.JSX: Script execution started."); // <<< ADD THIS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
console.log("MAIN.JSX: ReactDOM.render called."); // <<< ADD THIS
