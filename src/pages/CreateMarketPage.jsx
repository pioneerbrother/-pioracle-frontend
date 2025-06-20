// src/pages/CreateMarketPage.jsx
import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { WalletContext } from './WalletProvider';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import './CreateMarketPage.css';

const SUPPORTED_PRICE_FEEDS = [
    { name: "Bitcoin (BTC/USD)", symbolPrefix: "BTCUSD", address: "0xc907E116054Ad103354f2D350FD2514433D57F6f", decimals: 8 },
    { name: "Ethereum (ETH/USD)", symbolPrefix: "ETHUSD", address: "0xF9680D99D6C9589e2a93a78A04A279e509205945", decimals: 8 },
    { name: "MATIC (MATIC/USD)", symbolPrefix: "MATICUSD", address: "0xAB594600376Ec9fD91F8e885dADF0CE0228dda62", decimals: 8 },
];

function CreateMarketPage() {
    const { walletAddress, contract: predictionContractInstance, signer, connectionStatus } = useContext(WalletContext);
    const navigate = useNavigate();

    // Form State
    const [marketType, setMarketType] = useState('event');
    const [questionCore, setQuestionCore] = useState('');
    const [targetConditionValue, setTargetConditionValue] = useState('');
    const [selectedFeedInfo, setSelectedFeedInfo] = useState(SUPPORTED_PRICE_FEEDS[0]);
    const [selectedFeedAddress, setSelectedFeedAddress] = useState(SUPPORTED_PRICE_FEEDS[0]?.address || '');
    const [priceFeedTargetPrice, setPriceFeedTargetPrice] = useState('');
    const [assetSymbolInput, setAssetSymbolInput] = useState('');
    const [isSymbolManuallyEdited, setIsSymbolManuallyEdited] = useState(false);
    const [expiryDate, setExpiryDate] = useState('');
    const [expiryTime, setExpiryTime] = useState('23:59');
    const [resolutionDetails, setResolutionDetails] = useState('');
    const [creatorFeePercent, setCreatorFeePercent] = useState("0.5");
    // ... other state hooks ...
    const [listingFeeDisplay, setListingFeeDisplay] = useState('Fetching...');
    const [listingFeeWei, setListingFeeWei] = useState(null);
    const [isFeeLoading, setIsFeeLoading] = useState(true);
    const [feeError, setFeeError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => { /* ... fetchFee logic remains the same ... */ }, [predictionContractInstance, connectionStatus]);

    // --- NEW, SMARTER SYMBOL GENERATION ---
    const generateSymbol = useCallback(() => {
        if (isSymbolManuallyEdited) return assetSymbolInput;

        let parts = [];
        const qCoreClean = questionCore.trim().toUpperCase().replace(/ /g, '_').replace(/[^A-Z0-9_]/g, '');

        if (marketType === 'priceFeed' && selectedFeedInfo) {
            parts.push(selectedFeedInfo.symbolPrefix);
            parts.push("PRICE_ABOVE");
            parts.push(priceFeedTargetPrice.replace(/[$,]/g, ''));
        } else { // Event Market
            parts = qCoreClean.split('_').slice(0, 4);
            if(targetConditionValue.trim().toUpperCase() === 'YES'){
                 parts.push('YES');
            }
        }
        
        if (expiryDate) {
            try {
                const date = new Date(expiryDate + "T00:00:00Z");
                const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
                const day = date.getUTCDate();
                parts.push(`${month}${day < 10 ? '0' : ''}${day}`);
            } catch (e) { /* ignore date error */ }
        }

        const finalSymbol = parts.join('_').replace(/__+/g, '_').substring(0, 60);
        return finalSymbol || "EVENT_MARKET";
    }, [marketType, questionCore, targetConditionValue, selectedFeedInfo, priceFeedTargetPrice, expiryDate, isSymbolManuallyEdited, assetSymbolInput]);

    useEffect(() => {
        if (!isSymbolManuallyEdited) {
            setAssetSymbolInput(generateSymbol());
        }
    }, [generateSymbol, isSymbolManuallyEdited]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        // ... all your handleSubmit logic remains the same ...
    };
    
    // ... all your JSX in the return statement remains the same ...
    return (
        <div className="page-container create-market-page">
            {/* ... JSX ... */}
        </div>
    );
}

export default CreateMarketPage;