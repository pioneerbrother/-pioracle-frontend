// src/pages/TippingPage.jsx (New File)
import React, { useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from './WalletProvider';
// Import ABIs (assuming you placed them in src/config/abis/)
import TIPPING_JAR_ABI from '../config/abis/TippingJar.json'; 
import IERC20_ABI from '../config/abis/IERC20.json'; // A standard ERC20 ABI

// You'll need the TippingJar contract address for the current network
// and a list of test ERC20 token addresses on BSC Testnet
// This should ideally come from your contractConfig.js based on connected chain
const tippingJarAddress_bscTestnet = "0xd6d1A0cCFb89A56C58Aa5A72F92723e584aFcbA8"; // From deployment
const testUSDCTokenAddress_bscTestnet = "0x64544552ce784d068c36575d565a3de625334145"; // Example BSC Testnet USDC, find a real one or deploy your own mock ERC20

function TippingPage() {
    const { walletAddress, signer, provider, chainId, connectWallet } = useContext(WalletContext);
    const [tippingJarContract, setTippingJarContract] = useState(null);
    const [tokenAddress, setTokenAddress] = useState(testUSDCTokenAddress_bscTestnet); // Default to test USDC
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState(''); // For success/error messages
    const [isLoading, setIsLoading] = useState(false);

    // Initialize TippingJar contract instance when signer and correct chainId are available
    useEffect(() => {
        if (signer && chainId === 97) { // 97 is BSC Testnet
            try {
                const contractInstance = new ethers.Contract(tippingJarAddress_bscTestnet, TIPPING_JAR_ABI.abi, signer);
                setTippingJarContract(contractInstance);
                console.log("TippingJar contract instance created for BSC Testnet");
            } catch (e) {
                console.error("Error creating TippingJar contract instance:", e);
                setStatus("Error initializing tipping contract.");
            }
        } else {
            setTippingJarContract(null);
        }
    }, [signer, chainId]);

    const handleTip = async (e) => {
        e.preventDefault();
        if (!tippingJarContract || !walletAddress) {
            setStatus("Please connect your wallet to BSC Testnet.");
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setStatus("Please enter a valid amount.");
            return;
        }

        setIsLoading(true);
        setStatus("Processing tip...");

        try {
            const erc20Token = new ethers.Contract(tokenAddress, IERC20_ABI, signer);
            const amountInWei = ethers.utils.parseUnits(amount, 6); // Assuming 6 decimals for test USDC

            // 1. Approve TippingJar to spend tokens
            setStatus("Approving token spend...");
            const approveTx = await erc20Token.approve(tippingJarContract.address, amountInWei);
            await approveTx.wait(1);
            setStatus("Approval successful! Sending tip...");

            // 2. Call the tip function
            // For creator, let's use your deployer address for now, or make it selectable
            const creatorAddress = "0xcC853a5bc3f4129353DB6d5f92C781010167D288"; // Example, replace or make dynamic
            const tipTx = await tippingJarContract.tip(
                creatorAddress,
                tokenAddress,
                amountInWei,
                message
            );
            await tipTx.wait(1);
            setStatus(`Tip sent successfully! Tx: ${tipTx.hash.substring(0,10)}... Check for badge if amount was >= 50`);
            setAmount('');
            setMessage('');
        } catch (err) {
            console.error("Tipping error:", err);
            setStatus(`Error: ${err.reason || err.message || "Transaction failed."}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!walletAddress) {
        return <div className="page-container"><p>Please connect your wallet.</p><button onClick={connectWallet}>Connect Wallet</button></div>;
    }
    if (chainId !== 97) {
        return <div className="page-container"><p>Please switch to BNB Smart Chain Testnet (Chain ID 97) to use the tipping feature.</p></div>;
    }


    return (
        <div className="page-container">
            <h1>Tip & Get a Badge! (BSC Testnet)</h1>
            <form onSubmit={handleTip}>
                <div>
                    <label>Token to Tip (Test USDC Address on BSC Testnet):</label>
                    <input type="text" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} placeholder="ERC20 Token Address" required />
                </div>
                <div>
                    <label>Amount (e.g., 50 for $50 to get a badge):</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" required step="any" />
                </div>
                <div>
                    <label>Message (Optional):</label>
                    <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your message" />
                </div>
                <button type="submit" disabled={isLoading || !tippingJarContract}>
                    {isLoading ? "Processing..." : "Send Tip"}
                </button>
            </form>
            {status && <p>{status}</p>}
            <p><small>Note: Make sure you have test USDC (or other ERC20) on BSC Testnet and some tBNB for gas. Get test USDC from a faucet.</small></p>
        </div>
    );
}

export default TippingPage;