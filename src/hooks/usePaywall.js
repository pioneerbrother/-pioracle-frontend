// src/hooks/usePaywall.js

import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3ModalProvider } from '@web3modal/ethers5/react';

import { WalletContext } from '../pages/WalletProvider';
import { getTargetChainIdHex, getConfigForChainId } from '../config/contractConfig';
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';

export function usePaywall(post) {
    const { walletAddress, chainId, isConnected, isInitialized } = useContext(WalletContext);
    const { walletProvider } = useWeb3ModalProvider();

    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);
    
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');
    const [price, setPrice] = useState(null);
    const [txStatus, setTxStatus] = useState(null);

    const { premiumContentContract, usdcContract } = useMemo(() => {
        if (isConnected && walletProvider && chainId) {
            const provider = new ethers.providers.Web3Provider(walletProvider);
            const signer = provider.getSigner();
            const config = getConfigForChainId(chainId);
            const pcc = config?.premiumContentContractAddress ? new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer) : null;
            const usdc = config?.usdcTokenAddress ? new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer) : null;
            return { premiumContentContract: pcc, usdcContract: usdc };
        }
        return { premiumContentContract: null, usdcContract: null };
    }, [isConnected, walletProvider, chainId]);
    
    const contentId = useMemo(() => post?.slug ? ethers.utils.id(post.slug) : null, [post]);

    useEffect(() => {
        if (!isInitialized || !post) { setPageState('initializing'); return; }
        if (post.frontmatter.premium !== true) { setPageState('unlocked'); return; }
        if (!isConnected) { setPageState('prompt_connect'); return; }
        if (chainId !== targetChainId) { setPageState('unsupported_network'); return; }
        if (!premiumContentContract || !usdcContract) { setPageState('initializing'); return; }

        const checkAccess = async () => {
            setPageState('checking_access');
            try {
                const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                if (hasPaid) {
                    setPageState('unlocked');
                } else {
                    const feeInWei = await premiumContentContract.contentPrice();
                    let decimals = 18; // Default to 18
                    try { decimals = await usdcContract.decimals(); } catch (e) { console.warn("Could not fetch decimals, defaulting to 18."); }
                    setPrice({ amount: ethers.utils.formatUnits(feeInWei, decimals), symbol: 'USDC', raw: feeInWei });
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    setPageState(allowance.lt(feeInWei) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                setPageState('error');
                setErrorMessage('Could not verify access. Please ensure your wallet is on BNB Mainnet and refresh.');
            }
        };
        checkAccess();
    }, [isInitialized, post, isConnected, walletAddress, chainId, targetChainId, premiumContentContract, usdcContract, contentId]);
    
    const handleApprove = useCallback(async () => {
        if (!usdcContract || !premiumContentContract || !price) return;
        setPageState('checking');
        setErrorMessage('');
        setTxStatus({ type: 'approval', status: 'pending' });
        try {
            const tx = await usdcContract.approve(premiumContentContract.address, price.raw);
            setTxStatus({ type: 'approval', status: 'mined', txHash: tx.hash });
            await tx.wait();
            setTxStatus(null);
            setPageState('ready_to_unlock');
        } catch(e) {
            setTxStatus({ type: 'approval', status: 'error', error: e.message });
            setErrorMessage(`Approval failed: ${e.reason || 'Transaction rejected.'}`);
            setPageState('needs_approval');
        }
    }, [usdcContract, premiumContentContract, price]);
    
    const handleUnlock = useCallback(async () => {
        if (!premiumContentContract || !contentId) return;
        setPageState('checking');
        setErrorMessage('');
        setTxStatus({ type: 'unlock', status: 'pending' });
        try {
            const tx = await premiumContentContract.purchaseContent(contentId);
            setTxStatus({ type: 'unlock', status: 'mined', txHash: tx.hash });
            await tx.wait();
            setTxStatus(null);
            setPageState('unlocked');
        } catch(e) {
            setTxStatus({ type: 'unlock', status: 'error', error: e.message });
            setErrorMessage(`Unlock failed: ${e.reason || 'Transaction rejected.'}`);
            setPageState('ready_to_unlock');
        }
    }, [premiumContentContract, contentId]);

    const handleSwitchNetwork = useCallback(async () => {
        if (!window.ethereum) return;
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: getTargetChainIdHex() }],
            });
        } catch (error) {
            console.error('Failed to switch network:', error);
            setErrorMessage("Failed to switch network. Please do it manually in your wallet.");
        }
    }, []);

    return { pageState, errorMessage, price, txStatus, handleApprove, handleUnlock, handleSwitchNetwork };
}