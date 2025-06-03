import React, { useContext, useEffect } from 'react';
// In src/pages/ConnectTestPage.jsx
import { WalletContext } from '../contexts/WalletProvider'; // Check casing of 'contexts' and 'WalletProvider'
import { Link } from 'react-router-dom'; // Assuming you use React Router

 const ConnectTestPage = () => {
     const {
         connectWallet,
         walletAddress,
         connectionStatus,
         web3ModalInitError,
         provider,
         web3ModalInstance // For checking if it's initialized
     } = useContext(WalletContext);

     useEffect(() => {
         console.log("MOB_DEBUG_CONNECT_TEST_PAGE: Mounted");
         console.log("MOB_DEBUG_CONNECT_TEST_PAGE: web3ModalInstance exists:", !!web3ModalInstance);
         console.log("MOB_DEBUG_CONNECT_TEST_PAGE: web3ModalInitError:", web3ModalInitError);
     }, [web3ModalInstance, web3ModalInitError]);

     const handleConnect = () => {
         console.log("MOB_DEBUG_CONNECT_TEST_PAGE: Connect button clicked");
         connectWallet();
     };

     return (
         <div style={{ padding: '20px', textAlign: 'center' }}>
             <h1>Wallet Connection Test</h1>
             <p>This is a minimal page to test wallet connection.</p>

             {web3ModalInitError && (
                 <p style={{ color: 'red' }}>
                     Web3Modal Init Error: {web3ModalInitError}
                 </p>
             )}

             {!walletAddress ? (
                 <button
                     onClick={handleConnect}
                     disabled={!web3ModalInstance || !!web3ModalInitError} // Disable if modal not ready or init failed
                 >
                     Connect Wallet Here
                 </button>
             ) : (
                 <div>
                     <p>Connected: {walletAddress}</p>
                     <p>Provider type: {provider?.constructor.name}</p>
                     <Link to="/predictions">Go to Predictions Page</Link>
                 </div>
             )}
             <p style={{ marginTop: '20px', color: connectionStatus.type === 'error' ? 'red' : 'green' }}>
                 Status: {connectionStatus.message}
             </p>
             <p style={{ marginTop: '20px' }}>
                <Link to="/predictions">Go to Predictions Page (even if not connected)</Link>
             </p>
         </div>
     );
 };

 export default ConnectTestPage;