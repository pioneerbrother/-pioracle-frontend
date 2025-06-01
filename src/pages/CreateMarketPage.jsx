// pioracle/src/pages/CreateMarketPage.jsx
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers'; // Using Ethers v5 as per your project
import { WalletContext } from '../context/WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
// We don't seem to need marketutils.js directly in this component if it's just for form input
import './CreateMarketPage.css'; // Create this CSS file for styling

// For price feed selection. In a real app, this might come from a config or API.
const SUPPORTED_PRICE_FEEDS = [
    { name: "Bitcoin (BTC/USD)", symbolPrefix: "BTCUSD", address: "0xc907E116054Ad103354f2D350FD2514433D57F6f", decimals: 8 },
    { name: "Ethereum (ETH/USD)", symbolPrefix: "ETHUSD", address: "0xF9680D99D6C9589e2a93a78A04A279e509205945", decimals: 8 },
    { name: "MATIC (MATIC/USD)", symbolPrefix: "MATICUSD", address: "0xAB594600376Ec9fD91F8e885dADF0CE0228dda62", decimals: 8 },
    // Add more whitelisted feeds as needed
];

function CreateMarketPage() {
    const { walletAddress, contract: predictionContractInstance, signer, connectionStatus } = useContext(WalletContext);
    const navigate = useNavigate();

    // Form State
    const [marketType, setMarketType] = useState('event'); // 'event' or 'priceFeed'
    const [questionCore, setQuestionCore] = useState(''); // e.g., "Pi Coin price will be above"
    const [targetConditionValue, setTargetConditionValue] = useState(''); // e.g., "0.75" or "CandidateName"
    
    const [selectedFeedAddress, setSelectedFeedAddress] = useState(SUPPORTED_PRICE_FEEDS[0]?.address || '');
    const [priceFeedTargetPrice, setPriceFeedTargetPrice] = useState(''); // Human-readable, e.g., "120000" for $120,000

    const [assetSymbolInput, setAssetSymbolInput] = useState(''); // User can edit this
    const [isSymbolManuallyEdited, setIsSymbolManuallyEdited] = useState(false);
    
    const [expiryDate, setExpiryDate] = useState(''); // YYYY-MM-DD
    const [expiryTime, setExpiryTime] = useState('23:00');   // HH:MM (UTC default)
    
    const [resolutionDetails, setResolutionDetails] = useState(''); // For event markets
    const [creatorFeePercent, setCreatorFeePercent] = useState("0.5"); // Default 0.5%

    // Listing Fee State
    const [listingFeeDisplay, setListingFeeDisplay] = useState('Initializing...');
    const [listingFeeWei, setListingFeeWei] = useState(null);
    const [isFeeLoading, setIsFeeLoading] = useState(true);
    const [feeError, setFeeError] = useState('');
     console.log("CreateMarketPage RENDER - Fee States:", { isFeeLoading, feeError, listingFeeDisplay, listingFeeWei: listingFeeWei?.toString() });

    // Submission State
    const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isLoading for clarity
    const [submitError, setSubmitError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

   

    // Fetch listing fee from contract
    useEffect(() => {
        const fetchFee = async () => {
            console.log("CreateMarketPage: useEffect for fetchFee. Contract instance:", !!predictionContractInstance);
            if (predictionContractInstance && typeof predictionContractInstance.marketCreationListingFee === 'function') {
                setIsFeeLoading(true);
                setFeeError('');
                try {
                    console.log("CreateMarketPage: Attempting to fetch marketCreationListingFee from contract:", predictionContractInstance.address);
                    const feeInWei = await predictionContractInstance.marketCreationListingFee();
                    console.log("CreateMarketPage: Fetched feeInWei:", feeInWei.toString());
                    
                    setListingFeeWei(feeInWei);
                    setListingFeeDisplay(ethers.utils.formatEther(feeInWei) + " MATIC");
                } catch (e) {
                    console.error("CreateMarketPage: Error fetching listing fee:", e);
                    setFeeError("Could not load listing fee.");
                    setListingFeeDisplay("N/A"); 
                    setListingFeeWei(null);
                     console.log("CreateMarketPage fetchFee CATCH - Error set, fee display N/A");
                } finally {
                    setIsFeeLoading(false);
                }
            } else {
                console.log("CreateMarketPage: Contract instance or marketCreationListingFee function not ready yet.");
                // Don't set error if just waiting, but indicate loading
                setIsFeeLoading(true);
                setListingFeeDisplay("Waiting for contract connection...");
                if (predictionContractInstance && typeof predictionContractInstance.marketCreationListingFee !== 'function') {
                    setFeeError("Contract ABI might be outdated (missing fee function).");
                    setIsFeeLoading(false); // Not loading anymore if ABI is wrong
                }
            }
        };

        // Only fetch if contract instance is available, otherwise WalletProvider might still be initializing.
        if (predictionContractInstance) {
             fetchFee();
        } else {
            // If no contract instance and wallet is in error or disconnected state, reflect that.
            if (connectionStatus?.type === 'error') {
                setFeeError(`Wallet/Contract Error: ${connectionStatus.message}`);
                setIsFeeLoading(false);
                setListingFeeDisplay("N/A");
            }
        }
    }, [predictionContractInstance, connectionStatus?.type]); // Re-fetch if contract instance or connection status changes


    // Auto-generate symbol (very basic - needs significant improvement for production)
    const generateSymbol = useCallback(() => {
        if (isSymbolManuallyEdited && assetSymbolInput) return assetSymbolInput; // Don't override manual edits if field not empty

        let parts = [];
        if (marketType === 'priceFeed' && selectedFeedAddress) {
            const feed = SUPPORTED_PRICE_FEEDS.find(f => f.address === selectedFeedAddress);
            parts.push(feed ? feed.symbolPrefix : "ASSET");
            parts.push("PRICE_ABOVE"); // Assuming all price feeds are "PRICE_ABOVE" for now
            parts.push(priceFeedTargetPrice.replace('.', '_') || "TARGET");
        } else { // Event market
            parts.push(questionCore.substring(0,10).toUpperCase().replace(/[^A-Z0-9]/g, '') || "EVENT");
            parts.push("OUTCOME"); // Could be more descriptive
            parts.push(targetConditionValue.replace('.', '_').toUpperCase() || "TARGETVAL");
        }

        if (expiryDate) {
            try {
                const date = new Date(expiryDate + "T00:00:00Z"); // Treat date as UTC
                const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
                const day = date.getDate();
                parts.push(`${month}${day < 10 ? '0' : ''}${day}`);
            } catch (e) { parts.push("SOMEDATE"); }
        } else {
            parts.push("SOMEDATE");
        }
        return parts.join('_').substring(0, 60); // Max length
    }, [isSymbolManuallyEdited, assetSymbolInput, marketType, selectedFeedAddress, priceFeedTargetPrice, questionCore, targetConditionValue, expiryDate]);

    useEffect(() => {
        if (!isSymbolManuallyEdited) { // Only auto-update if not manually edited
            setAssetSymbolInput(generateSymbol());
        }
    }, [marketType, selectedFeedAddress, priceFeedTargetPrice, questionCore, targetConditionValue, expiryDate, isSymbolManuallyEdited, generateSymbol]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(''); setSuccessMessage(''); setIsSubmitting(true);

        if (!walletAddress || !signer || !predictionContractInstance || !listingFeeWei) {
            setSubmitError("Wallet not connected, or contract/listing fee not ready for submission.");
            setIsSubmitting(false); return;
        }
        if (parseFloat(creatorFeePercent) < 0 || parseFloat(creatorFeePercent) > 3) {
            setSubmitError("Creator fee must be between 0.00% and 3.00%.");
            setIsSubmitting(false); return;
        }
        if (!assetSymbolInput.trim()) {
            setSubmitError("Contract Asset Symbol is required.");
            setIsSubmitting(false); return;
        }
         if (marketType === 'event' && !resolutionDetails.trim()) {
            setSubmitError("Resolution details are required for event markets.");
            setIsSubmitting(false); return;
        }
        if (marketType === 'priceFeed' && (!selectedFeedAddress || !priceFeedTargetPrice.trim())) {
            setSubmitError("Price feed and target price are required for price feed markets.");
            setIsSubmitting(false); return;
        }
        if (!expiryDate || !expiryTime) {
            setSubmitError("Betting close date and time are required.");
            setIsSubmitting(false); return;
        }


        try {
            const _assetSymbol = assetSymbolInput.trim();
            const _isEventMarket = marketType === 'event';
            let _priceFeedAddressContract = ethers.constants.AddressZero; // Ethers v5
            let _targetPriceContract = ethers.BigNumber.from(1); // Default for event

            if (!_isEventMarket) {
                _priceFeedAddressContract = selectedFeedAddress;
                const feedInfo = SUPPORTED_PRICE_FEEDS.find(f => f.address === selectedFeedAddress);
                if (!feedInfo) throw new Error("Selected price feed details not found.");
                // Ensure priceFeedTargetPrice is a string before parsing
                _targetPriceContract = ethers.utils.parseUnits(String(priceFeedTargetPrice).trim(), feedInfo.decimals);
            }

            const fullExpiryString = `${expiryDate}T${expiryTime}:00Z`; // Time is assumed UTC from input
            const _expiryTimestamp = Math.floor(new Date(fullExpiryString).getTime() / 1000);
            
            const nowPlusMinContractBuffer = Math.floor(Date.now() / 1000) + (15 * 60 + 60); // Contract needs 15m + buffer
            if (isNaN(_expiryTimestamp) || _expiryTimestamp <= nowPlusMinContractBuffer) {
                 throw new Error("Betting close time must be a valid future date/time (at least ~16 minutes from now).");
            }

            const _creatorFeeBP = Math.round(parseFloat(creatorFeePercent) * 100);

            logInfo("Calling createUserMarket with:", {
                _assetSymbol, _priceFeedAddress: _priceFeedAddressContract, _targetPrice: _targetPriceContract.toString(),
                _expiryTimestamp, _isEventMarket, _creatorFeeBP, listingFee: listingFeeWei.toString()
            });

            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.createUserMarket(
                _assetSymbol, _priceFeedAddressContract, _targetPriceContract,
                _expiryTimestamp, _isEventMarket, _creatorFeeBP,
                { value: listingFeeWei }
            );

            setSuccessMessage(`Market creation transaction sent: ${tx.hash}. Waiting for confirmation...`);
            await tx.wait(1);
            setSuccessMessage(`Market "${_assetSymbol}" created successfully! ID: ${await predictionContractInstance.nextMarketId() - BigInt(1)}. Tx: ${tx.hash}`); // nextMarketId is now 1 greater
            setIsSubmitting(false);
            // Reset form fields
            setQuestionCore(''); setTargetConditionValue(''); setAssetSymbolInput(''); setIsSymbolManuallyEdited(false);
            setExpiryDate(''); setExpiryTime('23:00'); setResolutionDetails(''); setCreatorFeePercent("0.5");
            // navigate('/predictions'); // Optional: navigate after success
        } catch (err) {
            console.error("Error creating market:", err);
            const reason = err.reason || err.data?.message || err.message || "Failed to create market.";
            setSubmitError(`Error: ${reason}`);
            setIsSubmitting(false);
        }
    };
    

    return (
        <>
            <title>Create New Prediction Market | PiOracle</title>
            <meta name="description" content="Users can create their own prediction markets on PiOracle. Set your question, terms, resolution details, and your creator fee." />

            <div className="page-container create-market-page">
                <h2>Create Your Prediction Market</h2>
                
                {!walletAddress ? (
                    <p className="info-message" style={{textAlign: 'center', padding: '20px'}}>Please connect your wallet to create a market.</p>
                ) : (
                    <>
                        <p className="listing-fee-notice">
                            Market Listing Fee: 
                            {isFeeLoading ? <span style={{fontStyle: 'italic'}}>{listingFeeDisplay}</span> : 
                             feeError ? <span style={{color: 'red'}}>{feeError}</span> : 
                             <strong>{listingFeeDisplay}</strong>
                            }
                            (paid to platform)
                        </p>
                        <form onSubmit={handleSubmit} className="create-market-form">
                            <div className="form-group">
                                <label htmlFor="marketType">Market Type:</label>
                                <select id="marketType" value={marketType} onChange={(e) => setMarketType(e.target.value)}>
                                    <option value="event">Event Market (Resolved by PiOracle Admin based on your details)</option>
                                    <option value="priceFeed">Price Feed Market (Resolved by Chainlink Oracle)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="questionCore">Brief Market Question Core (e.g., "Bitcoin price will be above"): </label>
                                <input type="text" id="questionCore" value={questionCore} onChange={e => setQuestionCore(e.target.value)} placeholder="e.g., Pi Coin price will be above" maxLength={100} required/>
                                <small>This helps structure the market. Be clear and concise.</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="targetConditionValue">
                                    {marketType === 'priceFeed' ? 
                                        `Target Price for ${SUPPORTED_PRICE_FEEDS.find(f=>f.address === selectedFeedAddress)?.symbolPrefix || 'Selected Feed'}` : 
                                        "Target Outcome Value (e.g., 0.75 for $0.75, or specific text like 'CandidateA')"}
                                </label>
                                <input type="text" id="targetConditionValue" value={targetConditionValue} 
                                       onChange={e => setTargetConditionValue(e.target.value)} 
                                       placeholder={marketType === 'priceFeed' ? "e.g., 120000 (for $120,000.00)" : "e.g., 0.75 or Nawrocki"} 
                                       required 
                                />
                                {marketType === 'priceFeed' && <small>Enter the price without symbols e.g., 110000 for $110,000.00</small>}
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="assetSymbolInput">Contract Asset Symbol (Auto-generated, Editable):</label>
                                <input 
                                    type="text" id="assetSymbolInput" value={assetSymbolInput} 
                                    onChange={e => { setAssetSymbolInput(e.target.value); setIsSymbolManuallyEdited(true); }} 
                                    onFocus={() => { if(!isSymbolManuallyEdited) updateGeneratedSymbol(); }}
                                    placeholder="AUTO_GENERATED_OR_CUSTOM_SYMBOL" 
                                    required maxLength={60}
                                />
                                <button type="button" onClick={() => {setIsSymbolManuallyEdited(false); updateGeneratedSymbol();}} style={{marginLeft:'10px', padding: '8px 12px'}}>Regenerate</button>
                                <small>Max 60 chars, A-Z, 0-9, underscores. Must be unique on-chain. Example: PIUSD_PRICE_ABOVE_0_75_JUL01</small>
                            </div>

                            {marketType === 'priceFeed' && (
                                <div className="form-group">
                                    <label htmlFor="selectedFeedAddress">Select Oracle Price Feed:</label>
                                    <select id="selectedFeedAddress" value={selectedFeedAddress} onChange={(e) => setSelectedFeedAddress(e.target.value)} required>
                                        <option value="">-- Select a Price Feed --</option>
                                        {SUPPORTED_PRICE_FEEDS.map(feed => (
                                            <option key={feed.address} value={feed.address}>
                                                {feed.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {marketType === 'event' && (
                                <div className="form-group">
                                    <label htmlFor="resolutionDetails">Resolution Details & Source of Truth (Required for Event Markets):</label>
                                    <textarea
                                        id="resolutionDetails" value={resolutionDetails}
                                        onChange={(e) => setResolutionDetails(e.target.value)}
                                        placeholder="e.g., Outcome based on official results from [website/authority] published by [date/time]. This market asks 'Will X happen?', so a YES outcome means X happened."
                                        rows={4} required
                                    />
                                    <small>Be very specific. PiOracle admin will use this and publicly verifiable sources to resolve.</small>
                                </div>
                            )}

                            <div className="form-group form-group-inline">
                                <div>
                                    <label htmlFor="expiryDate">Betting Closes On (UTC Date):</label>
                                    <input type="date" id="expiryDate" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
                                </div>
                                <div>
                                    <label htmlFor="expiryTime">Betting Closes At (UTC Time):</label>
                                    <input type="time" id="expiryTime" value={expiryTime} onChange={(e) => setExpiryTime(e.target.value)} required />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="creatorFeePercent">Your Prediction Fee for this Market (0.00% to 3.00%):</label>
                                <input
                                    type="number" id="creatorFeePercent" value={creatorFeePercent}
                                    onChange={(e) => setCreatorFeePercent(e.target.value)}
                                    min="0" max="3" step="0.01" required
                                />
                                <small>This % of each prediction placed on this market will be sent to your connected wallet.</small>
                            </div>

                            {submitError && <ErrorMessage message={submitError} title="Creation Error" />}
                            {successMessage && <p className="form-message type-success">{successMessage}</p>}

                            <button 
                                type="submit" 
                                disabled={isSubmitting || isFeeLoading || !!feeError || !listingFeeWei || listingFeeWei.eq(0)} 
                                className="button primary create-market-submit-button"
                            >
                                {isSubmitting ? <LoadingSpinner size="small" /> : 
                                 isFeeLoading ? "Verifying Fee..." : 
                                 feeError ? "Cannot Create (Fee Issue)" :
                                 `Create Market & Pay ${listingFeeDisplay} Listing Fee`}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </>
    );
}

export default CreateMarketPage;