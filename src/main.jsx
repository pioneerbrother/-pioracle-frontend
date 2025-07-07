// main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import PioracleApp from './PioracleApp.jsx'; // Import the new component
import './index.css';

console.log("MAIN.JSX: Script execution started."); // <<< ADD THIS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
     <PioracleApp />
  </React.StrictMode>,
);
console.log("MAIN.JSX: ReactDOM.render called."); // <<< ADD THIS
