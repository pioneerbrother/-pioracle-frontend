// src/pages/ConnectTestPage.jsx
import React, { useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WalletContext } from './WalletProvider.jsx'; // Assuming WalletProvider is now in ./pages/

const ConnectTestPage = () => {
    const context = useContext(WalletContext);

    // Destructure with checks for null/undefined context initially
    const {
        connectWallet,
        walletAddress,
        connectionStatus,
        web3ModalInitError,
        provider,
        web3ModalInstanceExists, // Use the boolean flag
        isConnecting,            // Get this for button disabling
        uiDebugMessages         // Get the array of debug messages
    } = context || { // Provide default values if context is somehow null initially
        connectionStatus: { type: 'error', message: 'WalletContext not available' },
        uiDebugMessages: ['Error: WalletContext not found'],
        web3ModalInitError: null,
        web3ModalInstanceExists: false,
        isConnecting: false,
    };

    // Log what the page receives from context
    useEffect(() => {
        console.log("MOB_DEBUG_CONNECT_TEST_PAGE: Context received:", context);
    }, [context]);


    const handleConnect = () => {
        console.log("MOB_DEBUG_CONNECT_TEST_PAGE: Connect button clicked");
        if (connectWallet) {
            connectWallet();
        } else {
            console.error("MOB_DEBUG_CONNECT_TEST_PAGE: connectWallet function not available from context!");
        }
    };

    return (
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px' }}>
            <h1>Wallet Connection Test Page</h1>
            <p>This page helps debug the wallet connection flow.</p>

            <div style={{ margin: '20px auto', padding: '10px', border: '1px solid #eee', maxWidth: '600px', textAlign: 'left', background: '#f9f9f9' }}>
                <p><strong>Current Status:</strong> <span style={{ color: connectionStatus.type === 'error' ? 'red' : 'green' }}>{connectionStatus.message}</span></p>
                {walletAddress && <p><strong>Connected Address:</strong> {walletAddress}</p>}
                {provider && <p><strong>Provider Type:</strong> {provider.constructor.name}</p>}
                <hr />
                <p><strong>Web3Modal Initialized:</strong> {web3ModalInstanceExists ? <span style={{color: 'green'}}>Yes</span> : <span style={{color: 'red'}}>No</span>}</p>
                {web3ModalInitError && <p style={{ color: 'red' }}><strong>Modal Init Error:</strong> {web3ModalInitError}</p>}
                <p><strong>Is Connecting Flag:</strong> {isConnecting ? 'True' : 'False'}</p>
                <hr/>
                <p><strong>Debug Log (WalletProvider):</strong></p>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '5px', background: 'white' }}>
                    {(uiDebugMessages || []).map((msg, index) => (
                        <div key={index} style={{ borderBottom: '1px dotted #eee', marginBottom: '3px', paddingBottom: '3px', color: msg.includes("FAIL") || msg.includes("Error") ? 'red': 'inherit' }}>{msg}</div>
                    ))}
                </div>
            </div>

            {!walletAddress ? (
                <button
                    onClick={handleConnect}
                    disabled={!web3ModalInstanceExists || !!web3ModalInitError || isConnecting}
                    style={{ padding: '10px 20px', fontSize: '16px', cursor: (!web3ModalInstanceExists || !!web3ModalInitError || isConnecting) ? 'not-allowed' : 'pointer' }}
                >
                    Connect Wallet
                </button>
            ) : (
                <div>
                    <p style={{ color: 'green', fontWeight: 'bold' }}>Wallet Connected!</p>
                    <p>Address: {walletAddress}</p>
                    <button onClick={() => context.disconnectWallet && context.disconnectWallet()} style={{ padding: '10px 20px', fontSize: '16px', marginTop: '10px', backgroundColor: '#f44336', color: 'white' }}>
                        Disconnect Wallet
                    </button>
                </div>
            )}
            <p style={{ marginTop: '20px' }}>
                <Link to="/predictions">Go to Main Predictions Page</Link>
            </p>
        </div>
    );
};

export default ConnectTestPage;