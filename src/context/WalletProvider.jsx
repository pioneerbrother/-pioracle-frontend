// pioracle/src/context/WalletProvider.jsx
import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef
} from 'react';
import { ethers } from 'ethers';

import {
    getContractAddress,
    getContractAbi,
    getRpcUrl,
    getTargetChainIdHex,
} from '../config/contractConfig';

export const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
      console.log("WALLETPROVIDER.JSX: WalletProvider rendering.");
    const [walletAddress, setWalletAddress] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState({ type: null, message: '' });
    const [chainId, setChainId] = useState(null); 

    const [loadedContractAddress, setLoadedContractAddress] = useState(null);
    const [loadedReadOnlyRpcUrl, setLoadedReadOnlyRpcUrl] = useState(null);
    const [loadedTargetChainIdHex, setLoadedTargetChainIdHex] = useState(null);

    console.log("PiOracle WalletProvider: Using ethers version:", ethers.version);

    // Effect 1: Load dynamic configuration ONCE on mount
    useEffect(() => {
        console.log("PiOracle WalletProvider: Effect 1 (ConfigLoad) - Loading dynamic configuration...");
        const addr = getContractAddress();
        const rpc = getRpcUrl();
        const targetChainHex = getTargetChainIdHex();

        setLoadedContractAddress(addr);
        setLoadedReadOnlyRpcUrl(rpc);
        setLoadedTargetChainIdHex(targetChainHex);

        if (!addr || !rpc || !targetChainHex) {
            const missing = [!addr && "Contract Address", !rpc && "RPC URL", !targetChainHex && "Target Chain ID"].filter(Boolean).join(", ");
            console.error(`PiOracle WalletProvider: Effect 1 (ConfigLoad) - Critical DApp configuration missing: ${missing}. Check .env and contractConfig.js.`);
            setConnectionStatus({ type: 'error', message: `Critical DApp configuration missing: ${missing}.` });
        } else {
            console.log("PiOracle WalletProvider: Effect 1 (ConfigLoad) - Dynamic configuration loaded:", { addr, rpc, targetChainHex });
        }
    }, []); // Empty dependency array: runs once on mount

    // useCallback for initializeContract
    const initializeContract = useCallback((currentSignerOrProvider, addressToUse) => {
        const abiToUse = getContractAbi();
        console.log("PiOracle WalletProvider (initializeContract): Attempting with address:", addressToUse, "Provider/Signer:", currentSignerOrProvider ? currentSignerOrProvider.constructor.name : 'null');

        if (!currentSignerOrProvider) { console.warn("PiOracle WalletProvider (initializeContract): No provider/signer."); setContract(null); return false; }
        if (!addressToUse || !ethers.utils.isAddress(addressToUse)) { console.error("PiOracle WalletProvider (initializeContract): Invalid or missing contract address:", addressToUse); setContract(null); setConnectionStatus({type: 'error', message: "Contract address configuration error."}); return false; }
        if (!abiToUse || abiToUse.length === 0) { console.error("PiOracle WalletProvider (initializeContract): Contract ABI missing or empty."); setContract(null); setConnectionStatus({type: 'error', message: "Contract ABI configuration error."}); return false; }

        try {
            const instance = new ethers.Contract(addressToUse, abiToUse, currentSignerOrProvider);
            setContract(instance); // This will update the context value
            console.log(`PiOracle WalletProvider: Contract instance INITIALIZED at ${addressToUse} with ${currentSignerOrProvider.constructor.name}.`);
            if (connectionStatus.type === 'error' && (connectionStatus.message.includes('contract') || connectionStatus.message.includes('RPC') || connectionStatus.message.includes('signer'))) {
                 setConnectionStatus({ type: null, message: '' });
            }
            return true;
        } catch (e) { console.error("PiOracle WalletProvider: ERROR INITIALIZING CONTRACT INSTANCE:", e); setContract(null); setConnectionStatus({ type: 'error', message: `Failed to initialize contract: ${e.message}` }); return false; }
    }, [connectionStatus.type, connectionStatus.message]);


    // useCallback for disconnectWalletF
    const disconnectWalletF = useCallback(() => {
       console.log('PiOracle WalletProvider: disconnectWalletF called.');
       setWalletAddress(null);
       setSigner(null);
       // setChainId(null); // Keep chainId of read-only provider if it's set next
       setConnectionStatus({ type: 'info', message: 'Wallet disconnected.' });

       if (loadedReadOnlyRpcUrl && loadedContractAddress) {
           try {
               console.log("PiOracle WalletProvider DisconnectWalletF: Re-initializing read-only provider with RPC:", loadedReadOnlyRpcUrl);
               const defaultProvider = new ethers.providers.JsonRpcProvider(loadedReadOnlyRpcUrl);
               setProvider(defaultProvider); 
               initializeContract(defaultProvider, loadedContractAddress);
               defaultProvider.getNetwork().then(net => {
                   if (net?.chainId) setChainId(net.chainId); // Set chainId for read-only
               }).catch(err => console.error("PiOracle DisconnectWalletF: Error getting network for new read-only provider:", err));
           } catch(e) {
               console.error("PiOracle DisconnectWalletF: Error re-initializing read-only provider:", e);
               setProvider(null); setContract(null); setChainId(null);
               setConnectionStatus({type: 'error', message: 'Failed to restore read-only access.'});
           }
       } else {
           console.warn("PiOracle DisconnectWalletF: Cannot re-init read-only, config (RPC/Address) not loaded.");
           setProvider(null); setContract(null); setChainId(null);
       }
    }, [initializeContract, loadedReadOnlyRpcUrl, loadedContractAddress]);


    // useCallback for handleAccountsChanged
    const handleAccountsChanged = useCallback(async (accounts) => {
        console.log('PiOracle WalletProvider: handleAccountsChanged. Accounts:', accounts, 'Current provider before logic:', provider?.constructor.name);
        const firstAccount = accounts?.[0];

        if (firstAccount && ethers.utils.isAddress(firstAccount) && provider instanceof ethers.providers.Web3Provider) {
            const validAddress = ethers.utils.getAddress(firstAccount);
            console.log("PiOracle WalletProvider (handleAccountsChanged): Valid account detected/changed to:", validAddress);
            setWalletAddress(validAddress); // This will trigger Effect 3 if signer isn't set
            // Signer and contract re-initialization will be handled by Effect 3
        } else {
            console.log('PiOracle WalletProvider (handleAccountsChanged): No valid account from MetaMask or provider not Web3Provider.');
            if (!accounts || accounts.length === 0) {
                console.log("PiOracle WalletProvider (handleAccountsChanged): Accounts array is empty (MetaMask disconnected from site). Calling disconnectWalletF.");
                disconnectWalletF(); 
            } else {
                // This case means accounts might exist, but provider is not Web3Provider.
                // This could happen if the initial provider was JsonRpc and an accountsChanged event fires (less common).
                // Or if handleAccountsChanged was called before `provider` state was updated to Web3Provider.
                // Ensure walletAddress and signer are null if we don't have a valid Web3Provider connection.
                if (!(provider instanceof ethers.providers.Web3Provider)) {
                    setWalletAddress(null);
                    setSigner(null);
                }
            }
        }
    }, [provider, initializeContract, loadedContractAddress, disconnectWalletF]);


    // useCallback for handleChainChanged
    const handleChainChanged = useCallback(async (newChainIdHex) => {
        console.log(`PiOracle WalletProvider: handleChainChanged. New Chain ID (hex): ${newChainIdHex}`);
        const newChainIdNum = parseInt(newChainIdHex, 16);
        // setChainId(newChainIdNum); // Set by Effect 3 or pre-auth after provider is confirmed

        if (typeof window.ethereum !== 'undefined') {
            try {
                const newWeb3Provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                setProvider(newWeb3Provider); // Set the new provider. Effect 3 will handle the rest.
                // Set chainId directly from new provider
                newWeb3Provider.getNetwork().then(net => { if(net?.chainId) setChainId(net.chainId);});

                // If walletAddress was already set, Effect 3 will try to get a new signer for the new chain
                // If no walletAddress, Effect 3 will try to init read-only contract on new chain with newWeb3Provider (if signer is null)
                // or more correctly, with a new JsonRpcProvider for the new chain if we had such logic.
                // For now, handleChainChanged primarily focuses on updating the provider from MetaMask.
            } catch (e) {
                console.error("PiOracle WalletProvider: Error creating new Web3Provider on chain change", e);
                setProvider(null); setSigner(null); setContract(null); setChainId(null);
                setConnectionStatus({ type: 'error', message: 'Error adapting to network change.' });
            }
        }
    }, []); // Removed dependencies as it mainly resets provider from window.ethereum


    // Refs for stable event handlers
    const handleAccountsChangedRef = useRef(handleAccountsChanged);
    const handleChainChangedRef = useRef(handleChainChanged);
    useEffect(() => { handleAccountsChangedRef.current = handleAccountsChanged; }, [handleAccountsChanged]);
    useEffect(() => { handleChainChangedRef.current = handleChainChanged; }, [handleChainChanged]);

    // Effect 2: Initial setup (listeners & read-only or pre-authorized setup)
    useEffect(() => {
        console.log("PiOracle WalletProvider: Effect 2 (MainSetup) - RUNNING.");
        let didCancel = false;

        if (!loadedContractAddress || !loadedReadOnlyRpcUrl || !loadedTargetChainIdHex) {
            console.log("PiOracle WalletProvider: Effect 2 (MainSetup) - Waiting for dynamic configuration.");
            return; 
        }

        const listenerAccountWrapper = (accounts) => { console.log("MetaMask event: 'accountsChanged' triggered by extension."); if (!didCancel) handleAccountsChangedRef.current(accounts); };
        const listenerChainWrapper = (chainIdHex) => { console.log("MetaMask event: 'chainChanged' triggered by extension."); if (!didCancel) handleChainChangedRef.current(chainIdHex); };

        if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
            console.log("PiOracle WalletProvider: Effect 2 (MainSetup) - MetaMask detected.");
            const ethProviderInstanceFromMetaMask = new ethers.providers.Web3Provider(window.ethereum, "any");

            window.ethereum.on('accountsChanged', listenerAccountWrapper);
            window.ethereum.on('chainChanged', listenerChainWrapper);
            console.log("PiOracle WalletProvider: Effect 2 (MainSetup) - MetaMask event listeners attached.");

            ethProviderInstanceFromMetaMask.listAccounts().then(accounts => {
                if (didCancel) return;
                if (accounts.length > 0 && ethers.utils.isAddress(accounts[0])) {
                    console.log("PiOracle WalletProvider: Effect 2 (MainSetup) - Wallet previously authorized with account:", accounts[0]);
                    setProvider(ethProviderInstanceFromMetaMask); // Set MetaMask provider
                    setWalletAddress(ethers.utils.getAddress(accounts[0])); // Set address
                    ethProviderInstanceFromMetaMask.getNetwork().then(net => { 
                         if (!didCancel && net?.chainId) setChainId(net.chainId);
                    }).catch(e => console.error("PiOracle WalletProvider: Effect 2 (MainSetup) - Error getting network for pre-auth", e));
                    // Signer and contract will be set by Effect 3 based on provider and walletAddress updates
                } else if (!provider && !signer) { // Only init read-only if no provider/signer already set
                    console.log("PiOracle WalletProvider: Effect 2 (MainSetup) - No pre-authorized accounts. Setting up read-only with RPC:", loadedReadOnlyRpcUrl);
                    if (!loadedReadOnlyRpcUrl) { setConnectionStatus({ type: 'error', message: 'Read-only RPC URL not configured.' }); return; }
                    try {
                        const defaultJsonRpcProvider = new ethers.providers.JsonRpcProvider(loadedReadOnlyRpcUrl);
                        setProvider(defaultJsonRpcProvider); // Set read-only provider
                        // Contract and chainId for read-only will be set by Effect 3
                    } catch (jsonRpcErr) {
                        console.error("PiOracle WalletProvider: Effect 2 (MainSetup) - Error creating JsonRpcProvider:", jsonRpcErr);
                        setConnectionStatus({ type: 'error', message: 'Could not create read-only provider.' });
                    }
                }
            }).catch(listAccErr => console.error("PiOracle WalletProvider: Effect 2 (MainSetup) - Error listing initial accounts:", listAccErr));
        } else {
            if (!didCancel) {
                console.log("PiOracle WalletProvider: Effect 2 (MainSetup) - MetaMask NOT detected.");
                setConnectionStatus({ type: 'info', message: 'MetaMask not detected.' });
                setProvider(null); setSigner(null); setContract(null); setChainId(null); // Clear all if no MM
            }
        }
        return () => {
            didCancel = true;
            if (window.ethereum?.removeListener) {
                window.ethereum.removeListener('accountsChanged', listenerAccountWrapper);
                window.ethereum.removeListener('chainChanged', listenerChainWrapper);
            }
        };
    }, [loadedContractAddress, loadedReadOnlyRpcUrl, loadedTargetChainIdHex]); // Only depends on loaded config

    // Effect 3: Setup signer and contract when provider and walletAddress are available, or setup read-only contract.
    useEffect(() => {
        console.log( // LOG 1
            "PiOracle WalletProvider: Effect 3 (SignerContractSetup) - FIRING.",
            "Provider type:", provider?.constructor.name, 
            "Wallet Address:", walletAddress, 
            "Signer exists?", !!signer,
            "Contract Address Loaded?", !!loadedContractAddress,
            "Contract exists:", !!contract, "Contract has signer?", !!contract?.signer
        );

        if (provider instanceof ethers.providers.Web3Provider && walletAddress && !signer && loadedContractAddress) {
            console.log("PiOracle WalletProvider: Effect 3 (SignerContractSetup) - CONDITIONS MET for signer. Attempting to set signer & contract."); // LOG 2
            try {
                const currentSigner = provider.getSigner();
                setSigner(currentSigner); 
                initializeContract(currentSigner, loadedContractAddress);
                console.log("PiOracle WalletProvider: Effect 3 (SignerContractSetup) - Signer and contract init with signer attempted.");
            } catch (e) { 
                console.error("PiOracle WalletProvider: Effect 3 (SignerContractSetup) - Error setting up signer/contract:", e);
                setConnectionStatus({ type: 'error', message: `Could not get signer: ${e.message}` });
            }
        } else if (provider instanceof ethers.providers.JsonRpcProvider && !walletAddress && loadedContractAddress) {
            if (!contract || (contract && contract.provider !== provider)) { 
                console.log("PiOracle WalletProvider: Effect 3 (SignerContractSetup) - Ensuring read-only contract with JsonRpcProvider.");
                initializeContract(provider, loadedContractAddress);
                if (!chainId && provider) { // Set chainId if not already set by MM
                    provider.getNetwork().then(net => {
                        if (net?.chainId) setChainId(net.chainId);
                    }).catch(e => console.error("PiOracle WalletProvider: Effect 3 - Error getting network for JsonRpcProvider", e));
                }
            }
        } else {
            if (provider instanceof ethers.providers.Web3Provider && walletAddress && loadedContractAddress) {
                let unmetConditions = [];
                if (!(provider instanceof ethers.providers.Web3Provider)) unmetConditions.push("Provider not Web3Provider"); // Should not happen if outer if is true
                if (!walletAddress) unmetConditions.push("WalletAddress not set"); // Should not happen
                if (signer) unmetConditions.push("Signer already set");
                if (!loadedContractAddress) unmetConditions.push("loadedContractAddress not set"); // Should not happen
                if (unmetConditions.length > 0) {
                    console.log("PiOracle WalletProvider: Effect 3 (SignerContractSetup) - Conditions for signer setup NOT MET because:", unmetConditions.join(" AND "));
                }
            }
        }
    }, [provider, walletAddress, loadedContractAddress, initializeContract, signer, contract, chainId]);


    // useCallback for connectWallet
    const connectWallet = useCallback(async () => {
        if (!loadedContractAddress || !loadedTargetChainIdHex) {
             setConnectionStatus({ type: 'error', message: 'DApp configuration not ready.' }); return;
        }
        if (isConnecting) { console.log("PiOracle WalletProvider (connectWallet): Connection already in progress."); return; }
        if (walletAddress && signer) { console.log("PiOracle WalletProvider (connectWallet): Already connected with signer."); return; }
        if (typeof window.ethereum === 'undefined' || !window.ethereum.isMetaMask) {
            setConnectionStatus({ type: 'error', message: 'MetaMask not detected.' }); return;
        }

        setIsConnecting(true);
        setConnectionStatus({ type: 'info', message: 'Connecting...' });
        try {
            const web3Provider = new ethers.providers.Web3Provider(window.ethereum, "any");
            // Request accounts first to trigger MetaMask popup
            const accounts = await web3Provider.send('eth_requestAccounts', []); 
            
            if (accounts.length > 0 && ethers.utils.isAddress(accounts[0])) {
                // Once accounts are approved, MetaMask's 'accountsChanged' event often fires,
                // which calls handleAccountsChanged, which then sets walletAddress.
                // Effect 3 then picks up provider & walletAddress to set signer & contract.
                // To ensure provider is set immediately for Effect 3:
                setProvider(web3Provider); // Critical to update provider state
                
                // For more immediate feedback after eth_requestAccounts, we can also set address and chainId here
                const currentAddress = ethers.utils.getAddress(accounts[0]);
                setWalletAddress(currentAddress); // This will help trigger Effect 3
                const network = await web3Provider.getNetwork();
                setChainId(network.chainId);
                // Effect 3 should now have all it needs: provider=web3Provider, walletAddress=currentAddress, !signer

                setConnectionStatus({ type: 'success', message: 'Wallet connected! Finalizing setup...' });
                console.log(`PiOracle WalletProvider (connectWallet): Connection request successful for ${currentAddress}`);
            } else {
                 setConnectionStatus({ type: 'info', message: 'No account selected.' });
            }
        } catch (error) {
            console.error("PiOracle WalletProvider (connectWallet): Error:", error);
            let message = 'Failed to connect wallet.';
            if (error.code === 4001) message = 'Connection request rejected.';
            else if (error.code === -32002) message = 'Connection request pending.';
            setConnectionStatus({ type: 'error', message });
        }
        setIsConnecting(false);
    }, [isConnecting, walletAddress, signer, loadedContractAddress, loadedTargetChainIdHex, initializeContract]);

    // Context value
    const contextValue = useMemo(() => {
        console.log("PiOracle WalletProvider DEBUG: useMemo for contextValue evaluating. Contract instance:", !!contract, "Wallet Address:", walletAddress, "Signer:", !!signer);
        return {
            walletAddress, provider, signer, contract, chainId,
            loadedTargetChainIdHex, isConnecting, connectionStatus,
            connectWallet, 
            disconnectWallet: disconnectWalletF 
        };
    }, [
        walletAddress, provider, signer, contract, chainId, loadedTargetChainIdHex,
        isConnecting, connectionStatus, connectWallet, disconnectWalletF
    ]);

    console.log("PiOracle WalletProvider RENDERING. Current context walletAddress:", contextValue.walletAddress, "Current context contract:", !!contextValue.contract);

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    );
};

export default WalletProvider;