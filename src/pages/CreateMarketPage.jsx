// pioracle/src/pages/CreateMarketPage.jsx
import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers'; // Using Ethers v5 as per your project
import { WalletContext } from './WalletProvider'; 
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
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
    const [marketType, setMarketType] = useState('event');
    const [questionCore, setQuestionCore] = useState(''); 
    const [targetConditionValue, setTargetConditionValue] = useState('');
    
    const [selectedFeedInfo, setSelectedFeedInfo] = useState(SUPPORTED_PRICE_FEEDS[0]); // Default to first feed
    const [priceFeedTargetPrice, setPriceFeedTargetPrice] = useState(''); 

    const [assetSymbolInput, setAssetSymbolInput] = useState('');
    const [isSymbolManuallyEdited, setIsSymbolManuallyEdited] = useState(false);
    
    const [expiryDate, setExpiryDate] = useState('');
    const [expiryTime, setExpiryTime] = useState('23:00');   
    
    const [resolutionDetails, setResolutionDetails] = useState('');
    const [creatorFeePercent, setCreatorFeePercent] = useState("0.5");
    const [creatorEmail, setCreatorEmail] = useState(''); // Optional email

    // Listing Fee State
    const [listingFeeDisplay, setListingFeeDisplay] = useState('Initializing...');
    const [listingFeeWei, setListingFeeWei] = useState(null);
    const [isFeeLoading, setIsFeeLoading] = useState(true);
    const [feeError, setFeeError] = useState('');

    // Submission State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const fetchFee = async () => {
            if (predictionContractInstance && typeof predictionContractInstance.marketCreationListingFee === 'function') {
                setIsFeeLoading(true); setFeeError('');
                try {
                    console.log("CreateMarketPage: Attempting to fetch marketCreationListingFee from contract:", predictionContractInstance.address);
                    const feeInWei = await predictionContractInstance.marketCreationListingFee();
                    console.log("CreateMarketPage: Fetched feeInWei:", feeInWei.toString());
                    setListingFeeWei(feeInWei);
                    setListingFeeDisplay(ethers.utils.formatEther(feeInWei) + " MATIC");
                } catch (e) {
                    console.error("CreateMarketPage: Error fetching listing fee:", e);
                    setFeeError("Could not load listing fee from contract.");
                    setListingFeeDisplay("N/A"); setListingFeeWei(null);
                } finally {
                    setIsFeeLoading(false);
                }
            } else {
                setIsFeeLoading(true); setListingFeeDisplay("Waiting for contract...");
                if (predictionContractInstance && typeof predictionContractInstance.marketCreationListingFee !== 'function'){
                    setFeeError("Fee function missing. ABI issue?"); setIsFeeLoading(false);
                } else if (!predictionContractInstance && connectionStatus?.type === 'error') {
                    setFeeError(`Wallet/Contract Error: ${connectionStatus.message}`); setIsFeeLoading(false);
                }
            }
        };
        if (predictionContractInstance) fetchFee();
        else if (connectionStatus?.type === 'error') { // If wallet provider itself has an error
            setFeeError(`WalletProvider Error: ${connectionStatus.message}`);
            setIsFeeLoading(false);
            setListingFeeDisplay("N/A");
        }
    }, [predictionContractInstance, connectionStatus?.type]);

    const generateSymbol = useCallback(() => {
        if (isSymbolManuallyEdited && assetSymbolInput) return assetSymbolInput;

        let prefix = "EVENT";
        let condition = "ABOVE"; // Default, can be inferred from questionCore more smartly
        let targetForSymbol = targetConditionValue.replace(/[$.]/g, '').replace(',', '_'); // e.g., 0_75 or 110000
        let dateStr = "SOMEDATE";

        if (marketType === 'priceFeed' && selectedFeedInfo) {
            prefix = selectedFeedInfo.symbolPrefix;
            targetForSymbol = priceFeedTargetPrice.replace(/[$.]/g, '');
        } else if (marketType === 'event' && questionCore) {
            const qWords = questionCore.split(' ');
            prefix = qWords[0].substring(0,10).toUpperCase().replace(/[^A-Z0-9]/g, '') || "EVENT";
            if (questionCore.toLowerCase().includes("below") || questionCore.toLowerCase().includes("<")) condition = "BELOW";
        }
        
        if (expiryDate) {
            try {
                const date = new Date(expiryDate + "T00:00:00Z");
                const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
                const day = date.getDate();
                dateStr = `${month}${day < 10 ? '0' : ''}${day}`;
            } catch (e) { /* ignore */ }
        }
        const finalSymbol = `${prefix}_${condition}_${targetForSymbol}_${dateStr}`.toUpperCase().replace(/ /g,'_');
        return finalSymbol.substring(0, 60);
    }, [marketType, questionCore, targetConditionValue, selectedFeedInfo, priceFeedTargetPrice, expiryDate, isSymbolManuallyEdited, assetSymbolInput]);

    useEffect(() => {
        if (!isSymbolManuallyEdited) {
            setAssetSymbolInput(generateSymbol());
        }
    }, [generateSymbol, isSymbolManuallyEdited]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(''); 
        setSuccessMessage(''); 
        setIsSubmitting(true);

        if (!walletAddress || !signer || !predictionContractInstance || !listingFeeWei) {
            setSubmitError("Wallet not connected, or contract/listing fee not ready.");
            setIsSubmitting(false); // Changed from setIsLoading to setIsSubmitting
            return;
        }
        // ... (your existing form validation checks) ...
        // if (isNaN(feePercentage) || ...) { ... setIsSubmitting(false); return; }
        // if (!assetSymbolInput.trim()) { ... setIsSubmitting(false); return; }
        // ... etc. ...

        try {
            const _assetSymbol = assetSymbolInput.trim();
            const _isEventMarket = marketType === 'event';
            let _priceFeedAddressContract = ethers.constants.AddressZero;
            let _targetPriceContract = ethers.BigNumber.from(1);

            if (!_isEventMarket) {
                _priceFeedAddressContract = selectedFeedInfo.address;
                const feedDecimals = selectedFeedInfo.decimals;
                _targetPriceContract = ethers.utils.parseUnits(String(priceFeedTargetPrice).trim(), feedDecimals);
            }

            const fullExpiryString = `${expiryDate}T${expiryTime}:00Z`;
            const _expiryTimestamp = Math.floor(new Date(fullExpiryString).getTime() / 1000);
            
            const nowPlusMinContractBuffer = Math.floor(Date.now() / 1000) + (15 * 60 + 60);
            if (isNaN(_expiryTimestamp) || _expiryTimestamp <= nowPlusMinContractBuffer) {
                 throw new Error(`Betting close time (${new Date(_expiryTimestamp*1000).toISOString()}) must be a valid future date/time (at least ~16 minutes from now). Current time + buffer: ${new Date(nowPlusMinContractBuffer*1000).toISOString()}`);
            }

            const feePercentage = parseFloat(creatorFeePercent); // Ensure this is correctly parsed
            const _creatorFeeBP = Math.round(feePercentage * 100);

            console.log("Calling createUserMarket with on-chain params:", {
                _assetSymbol, _priceFeedAddress: _priceFeedAddressContract, _targetPrice: _targetPriceContract.toString(),
                _expiryTimestamp, _isEventMarket, _creatorFeeBP, listingFee: listingFeeWei.toString()
            });
            console.log("OFF-CHAIN INFO FOR ADMIN - Creator Email:", creatorEmail, "Resolution Details:", resolutionDetails, "Full Question:", questionCore, "Target Value Input:", targetConditionValue);

            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.createUserMarket(
                _assetSymbol, _priceFeedAddressContract, _targetPriceContract,
                _expiryTimestamp, _isEventMarket, _creatorFeeBP,
                { value: listingFeeWei }
            );

            // Show initial success message while waiting for confirmation
            setSuccessMessage(`Market creation transaction sent: ${tx.hash}. Waiting for confirmation...`);
            
            await tx.wait(1); // Wait for 1 confirmation

            // ---- START OF NEW CODE BLOCK TO ADD ----
            const newMarketIdBN = await predictionContractInstance.nextMarketId(); 
            // nextMarketId is the ID for the *next* market. The one just created is nextMarketId - 1.
            const newMarketId = newMarketIdBN.sub(1).toString(); 

            setSuccessMessage(`Market "${_assetSymbol}" (ID: ${newMarketId}) created successfully! Tx: ${tx.hash}. Redirecting...`);
            
            console.log("PiOracle Admin - User Market Created Successfully:");
            console.log("  Market ID:", newMarketId);
            console.log("  Symbol:", _assetSymbol);
            console.log("  Creator Wallet:", walletAddress);
            console.log("  Creator Email (if provided):", creatorEmail);
            // For event markets, you might want to store/send resolutionDetails to your backend here
            if (_isEventMarket) {
                console.log("  Resolution Details (for event markets):", resolutionDetails);
            }
            console.log("  Creator Fee BP:", _creatorFeeBP);

            // Reset form fields (optional here if navigating immediately, but good practice)
            setQuestionCore(''); setTargetConditionValue(''); setAssetSymbolInput(''); setIsSymbolManuallyEdited(false);
            setPriceFeedTargetPrice(''); setSelectedFeedInfo(SUPPORTED_PRICE_FEEDS[0]); // Assuming selectedFeedAddress also resets or is handled
            setExpiryDate(''); setExpiryTime('23:00'); setResolutionDetails(''); setCreatorFeePercent("0.5"); setCreatorEmail('');
            
            // Navigate back to the predictions list after a short delay
            setTimeout(() => {
                navigate('/predictions'); // Or your main market list route
            }, 3000); // 3-second delay
            // ---- END OF NEW CODE BLOCK TO ADD ----
            
        } catch (err) {
            console.error("Error creating market:", err);
            const reason = err.reason || err.data?.message || err.message || "Failed to create market.";
            setSubmitError(`Error: ${reason}`);
        }
        setIsSubmitting(false); // Make sure this is called in all paths (success/error)
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
                        <p className="listing-fee-notice" style={{textAlign: 'center', fontWeight: 'bold', margin: '15px 0'}}>
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
                                <select id="marketType" value={marketType} onChange={(e) => {setMarketType(e.target.value); setIsSymbolManuallyEdited(false);}}>
                                    <option value="event">Event Market (Resolved by PiOracle Admin based on your details)</option>
                                    <option value="priceFeed">Price Feed Market (Resolved by Chainlink Oracle)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="questionCore">Brief Market Question Core (e.g., "Bitcoin price will be above", "Pi Coin price will be below"): </label>
                                <input type="text" id="questionCore" value={questionCore} onChange={e => setQuestionCore(e.target.value)} placeholder="e.g., Pi Coin price will be above" maxLength={100} required/>
                                <small>This helps structure the market. Be clear and concise. Example: "Ethereum price will be below", "Election X winner will be"</small>
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
                                {marketType === 'priceFeed' && <small>Enter the price without currency symbols e.g., 110000 for $110,000.00. Decimals will be handled based on selected feed.</small>}
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="assetSymbolInput">Contract Asset Symbol (Auto-generated, Editable):</label>
                                <div style={{display: 'flex', alignItems: 'center'}}>
                                    <input 
                                        type="text" id="assetSymbolInput" value={assetSymbolInput} 
                                        onChange={e => { setAssetSymbolInput(e.target.value); setIsSymbolManuallyEdited(true); }} 
                                        placeholder="AUTO_GENERATED_SYMBOL" 
                                        required 
                                        maxLength={60}
                                        style={{flexGrow: 1, marginRight: '10px'}}
                                    />
                                    <button type="button" onClick={() => {setIsSymbolManuallyEdited(false); /* generateSymbol will be called by useEffect */ }} className="button secondary">Regenerate</button>
                                </div>
                                <small>Max 60 chars, A-Z, 0-9, underscores. Must be unique on-chain. Example: PIUSD_PRICE_ABOVE_0_75_JUL01</small>
                            </div>


                            {marketType === 'priceFeed' && (
                                <div className="form-group">
                                    <label htmlFor="selectedFeedAddress">Select Oracle Price Feed:</label>
                                    <select id="selectedFeedAddress" value={selectedFeedAddress} onChange={(e) => {setSelectedFeedAddress(e.target.value); setSelectedFeedInfo(SUPPORTED_PRICE_FEEDS.find(f => f.address === e.target.value) || null); setIsSymbolManuallyEdited(false);}} required={marketType === 'priceFeed'}>
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
                                        rows={4} required={marketType === 'event'}
                                    />
                                    <small>Be very specific. PiOracle admin will use this and publicly verifiable sources to resolve.</small>
                                </div>
                            )}

                            <div className="form-group form-group-inline">
                                <div>
                                    <label htmlFor="expiryDate">Betting Closes On (UTC Date):</label>
                                    <input type="date" id="expiryDate" value={expiryDate} onChange={(e) => {setExpiryDate(e.target.value); setIsSymbolManuallyEdited(false);}} required />
                                </div>
                                <div>
                                    <label htmlFor="expiryTime">Betting Closes At (UTC Time):</label>
                                    <input type="time" id="expiryTime" value={expiryTime} onChange={(e) => {setExpiryTime(e.target.value); setIsSymbolManuallyEdited(false);}} required />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="creatorEmail">Your Email (Optional - for market communication):</label>
                                <input
                                    type="email" id="creatorEmail" value={creatorEmail}
                                    onChange={(e) => setCreatorEmail(e.target.value)}
                                    placeholder="yourname@example.com" maxLength={100}
                                />
                                <small>We may use this to contact you about your market, especially if it's an event market needing clarification for resolution. This email will NOT be stored on the blockchain.</small>
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