import React, { useState, useContext, useMemo } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from './WalletProvider.jsx';
import PredictionMarketABI from '../config/abis/PredictionMarketP2P.json';

const OLD_CONTRACTS = {
    137: '0x1F52a81DF45d8098E676285a436e51a49dC145BC',
    56: '0x3D93FD642837e61Ef34D6808cE0b29Ec3e15d1C8'
};

const MarketState = {
    Resolved_YesWon: 2,
    Resolved_NoWon: 3,
    Resolved_Push: 4
};

function AdminResolvePage() {
    const { signer, walletAddress, chainId, connectWallet } = useContext(WalletContext);
    const [marketIdInput, setMarketIdInput] = useState('');
    const [statusMessage, setStatusMessage] = useState('Connect wallet to begin.');
    const [isLoading, setIsLoading] = useState(false);

    const currentOldContractAddress = useMemo(() => {
        return OLD_CONTRACTS[chainId] || null;
    }, [chainId]);

    const handleResolve = async (outcomeState) => {
        if (!signer) {
            setStatusMessage('Error: Please connect your owner wallet.');
            connectWallet();
            return;
        }
        if (!marketIdInput.trim()) {
            setStatusMessage('Error: Please enter a Market ID.');
            return;
        }
        if (!currentOldContractAddress) {
            setStatusMessage(`Error: No old contract configured for chain ID ${chainId}. Please switch to Polygon or BNB Chain.`);
            return;
        }

        setIsLoading(true);
        setStatusMessage(`Resolving market ${marketIdInput}...`);

        try {
            const contract = new ethers.Contract(currentOldContractAddress, PredictionMarketABI.abi, signer);
            const tx = await contract.ownerResolveEventMarket(marketIdInput, outcomeState);
            
            setStatusMessage('Transaction sent! Waiting for confirmation...');
            await tx.wait();

            setStatusMessage(`Success! Market ${marketIdInput} resolved. Tx: ${tx.hash}`);
            setMarketIdInput('');

        } catch (error) {
            console.error("Resolution failed:", error);
            const reason = error.reason || error.message || 'Transaction failed. Check browser console.';
            setStatusMessage(`Error: ${reason}`);
        } finally {
            setIsLoading(false);
        }
    };

    const buttonStyle = {
        padding: '10px 15px',
        margin: '5px',
        fontSize: '16px',
        cursor: 'pointer',
        border: '1px solid #555',
        backgroundColor: '#f0f0f0'
    };
    
    const disabledButtonStyle = {
        ...buttonStyle,
        cursor: 'not-allowed',
        backgroundColor: '#ccc'
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
            <h1>Admin Market Resolution Tool</h1>
            <p style={{ color: '#666' }}>Use this page to resolve markets on the OLD contracts.</p>
            
            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', backgroundColor: '#fafafa' }}>
                <h3>Status</h3>
                <p><strong>Your Address:</strong> {walletAddress || 'Not Connected'}</p>
                <p><strong>Connected Chain ID:</strong> {chainId || 'N/A'}</p>
                <p><strong>Target Old Contract:</strong> {currentOldContractAddress || 'None for this chain'}</p>
            </div>

            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1rem' }}>
                <h3>Actions</h3>
                <div>
                    <label htmlFor="marketId" style={{ display: 'block', marginBottom: '5px' }}>Market ID to Resolve:</label>
                    <input
                        id="marketId"
                        type="text"
                        value={marketIdInput}
                        onChange={(e) => setMarketIdInput(e.target.value)}
                        placeholder="Enter Market ID"
                        style={{ padding: '8px', width: '200px' }}
                        disabled={isLoading}
                    />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <button 
                        onClick={() => handleResolve(MarketState.Resolved_YesWon)} 
                        disabled={isLoading || !signer}
                        style={isLoading || !signer ? disabledButtonStyle : buttonStyle}
                    >
                        Resolve as YES
                    </button>
                    <button 
                        onClick={() => handleResolve(MarketState.Resolved_NoWon)} 
                        disabled={isLoading || !signer}
                        style={isLoading || !signer ? disabledButtonStyle : buttonStyle}
                    >
                        Resolve as NO
                    </button>
                    <button 
                        onClick={() => handleResolve(MarketState.Resolved_Push)} 
                        disabled={isLoading || !signer}
                        style={isLoading || !signer ? disabledButtonStyle : buttonStyle}
                    >
                        Resolve as PUSH
                    </button>
                </div>
            </div>

            {statusMessage && (
                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1rem', marginTop: '1rem', backgroundColor: '#f0f0f0' }}>
                    <strong>Status:</strong> {statusMessage}
                </div>
            )}
        </div>
    );
}

export default AdminResolvePage;