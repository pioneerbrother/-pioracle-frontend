import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { WalletContext } from './WalletProvider';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import './CreateMarketPage.css'; // Ensure this CSS file exists and is styled

// Define outside component if it's static and doesn't depend on component's props/state
const SUPPORTED_PRICE_FEEDS = [
    { name: "Bitcoin (BTC/USD)", symbolPrefix: "BTCUSD", address: "0xc907E116054Ad103354f2D350FD2514433D57F6f", decimals: 8 },
    { name: "Ethereum (ETH/USD)", symbolPrefix: "ETHUSD", address: "0xF9680D99D6C9589e2a93a78A04A279e509205945", decimals: 8 },
    { name: "MATIC (MATIC/USD)", symbolPrefix: "MATICUSD", address: "0xAB594600376Ec9fD91F8e885dADF0CE0228dda62", decimals: 8 },
    // Add more as needed
];

function CreateMarketPage() {
    const { walletAddress, contract: predictionContractInstance, signer, connectionStatus } = useContext(WalletContext);
    const navigate = useNavigate();

    // Form State
    const [marketType, setMarketType] = useState('event'); // 'event' or 'priceFeed'
    const [questionCore, setQuestionCore] = useState(''); 
    const [targetConditionValue, setTargetConditionValue] = useState(''); // Used for event market's target value if numeric, or symbol generation

    const [selectedFeedInfo, setSelectedFeedInfo] = useState(SUPPORTED_PRICE_FEEDS.length > 0 ? SUPPORTED_PRICE_FEEDS[0] : null);
    const [selectedFeedAddress, setSelectedFeedAddress] = useState(SUPPORTED_PRICE_FEEDS.length > 0 ? SUPPORTED_PRICE_FEEDS[0].address : '');
    const [priceFeedTargetPrice, setPriceFeedTargetPrice] = useState(''); // For price feed markets numeric target

    const [assetSymbolInput, setAssetSymbolInput] = useState('');
    const [isSymbolManuallyEdited, setIsSymbolManuallyEdited] = useState(false);
    
    const [expiryDate, setExpiryDate] = useState(''); // YYYY-MM-DD
    const [expiryTime, setExpiryTime] = useState('23:59'); // Default to end of day
    
    const [resolutionDetails, setResolutionDetails] = useState(''); // For event markets
    const [creatorFeePercent, setCreatorFeePercent] = useState("0.5"); // String for input, will be parsed
    const [creatorEmail, setCreatorEmail] = useState('');

    // Listing Fee State
    const [listingFeeDisplay, setListingFeeDisplay] = useState('Fetching...');
    const [listingFeeWei, setListingFeeWei] = useState(null);
    const [isFeeLoading, setIsFeeLoading] = useState(true);
    const [feeError, setFeeError] = useState('');

    // Submission State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch Listing Fee from Contract
    useEffect(() => {
        const fetchFee = async () => {
            if (predictionContractInstance && typeof predictionContractInstance.marketCreationListingFee === 'function') {
                setIsFeeLoading(true); 
                setFeeError('');
                console.log("CreateMarketPage_DEBUG: Attempting to fetch marketCreationListingFee.");
                try {
                    const feeInWei = await predictionContractInstance.marketCreationListingFee();
                    console.log("CreateMarketPage_DEBUG: Fetched feeInWei:", feeInWei.toString());
                    setListingFeeWei(feeInWei);
                    setListingFeeDisplay(ethers.utils.formatEther(feeInWei) + " MATIC");
                } catch (e) {
                    console.error("CreateMarketPage_DEBUG: Error fetching listing fee:", e);
                    setFeeError("Could not load listing fee.");
                    setListingFeeDisplay("Error"); 
                    setListingFeeWei(null);
                } finally {
                    setIsFeeLoading(false);
                }
            } else {
                if (connectionStatus?.type === 'error' && connectionStatus.message) {
                    setFeeError(`Wallet/Contract Error: ${connectionStatus.message}`);
                } else if (!predictionContractInstance && connectionStatus?.type !== 'info') { // Not initializing and no contract
                    setFeeError("Contract not available to fetch fee.");
                } else {
                     setFeeError("Waiting for contract to fetch fee..."); // Default waiting message
                }
                setIsFeeLoading(false); // Ensure loading stops if contract not available
                setListingFeeDisplay("N/A");
            }
        };

        // Only fetch if not in an error state from WalletProvider and contract is somewhat ready
        if (predictionContractInstance) {
           fetchFee();
        } else if (connectionStatus?.type === 'info' && connectionStatus.message?.toLowerCase().includes('initializing')) {
            setListingFeeDisplay("Initializing wallet...");
            setIsFeeLoading(true);
        } else {
            setListingFeeDisplay("Contract not ready");
            setIsFeeLoading(false);
        }
    }, [predictionContractInstance, connectionStatus?.type, connectionStatus?.message]);

    // Auto-Generate Asset Symbol
    const generateSymbol = useCallback(() => {
        if (isSymbolManuallyEdited && assetSymbolInput) return assetSymbolInput;

        let prefix = "EVENT";
        let condition = "ABOVE"; // Default
        let targetForSymbol = targetConditionValue.replace(/[$.]/g, '').replace(/,/g, '_');
        let dateStr = "EXPIRY"; // Default if no date

        if (marketType === 'priceFeed' && selectedFeedInfo) {
            prefix = selectedFeedInfo.symbolPrefix || "PRICE";
            targetForSymbol = priceFeedTargetPrice.replace(/[$.]/g, '').replace(/,/g, '_');
        } else if (marketType === 'event' && questionCore) {
            const qWords = questionCore.trim().split(' ');
            if (qWords.length > 0 && qWords[0]) {
                prefix = qWords[0].substring(0, 10).toUpperCase().replace(/[^A-Z0-9_]/g, '');
            }
            const qLower = questionCore.toLowerCase();
            if (qLower.includes("below") || qLower.includes("<")) condition = "BELOW";
            else if (qLower.includes("equal to") || qLower.includes("=") || qLower.includes(" is ")) condition = "EQUAL";
            // Default is ABOVE
        }
        
        if (expiryDate) {
            try {
                const date = new Date(expiryDate + "T00:00:00Z"); // Treat date input as start of UTC day
                const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
                const day = date.getUTCDate();
                dateStr = `${month}${day < 10 ? '0' : ''}${day}`;
            } catch (e) { console.warn("CreateMarketPage_DEBUG: Error parsing expiryDate for symbol:", e); }
        }
        const finalSymbol = `${prefix}_${condition}_${targetForSymbol}_${dateStr}`.toUpperCase().replace(/__+/g, '_').replace(/[^A-Z0-9_]/g, '').substring(0, 60);
        return finalSymbol || "PREDICTION_MARKET"; // Fallback if all parts are empty
    }, [marketType, questionCore, targetConditionValue, selectedFeedInfo, priceFeedTargetPrice, expiryDate, isSymbolManuallyEdited, assetSymbolInput]);

    useEffect(() => {
        if (!isSymbolManuallyEdited) {
            setAssetSymbolInput(generateSymbol());
        }
    }, [generateSymbol, isSymbolManuallyEdited]);

    // Form Reset
    const resetForm = () => {
        setMarketType('event');
        setQuestionCore('');
        setTargetConditionValue('');
        setSelectedFeedInfo(SUPPORTED_PRICE_FEEDS.length > 0 ? SUPPORTED_PRICE_FEEDS[0] : null);
        setSelectedFeedAddress(SUPPORTED_PRICE_FEEDS.length > 0 ? SUPPORTED_PRICE_FEEDS[0].address : '');
        setPriceFeedTargetPrice('');
        // setAssetSymbolInput(''); // Let it regenerate
        setIsSymbolManuallyEdited(false); // This will trigger symbol regeneration via useEffect
        setExpiryDate('');
        setExpiryTime('23:59');
        setResolutionDetails('');
        setCreatorFeePercent("0.5");
        setCreatorEmail('');
        setSubmitError('');
        setSuccessMessage('');
    };

    // Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(''); 
        setSuccessMessage(''); 
        setIsSubmitting(true);

        if (!walletAddress || !signer || !predictionContractInstance) {
            setSubmitError("Wallet not connected or contract not ready. Please connect/refresh.");
            setIsSubmitting(false); return;
        }
        if (!listingFeeWei || listingFeeWei.isZero()) {
            setSubmitError(feeError || "Market listing fee is not properly set or is zero. Cannot create market.");
            setIsSubmitting(false); return;
        }

        // --- Form Validations ---
        const feePercentageNum = parseFloat(creatorFeePercent);
        if (isNaN(feePercentageNum) || feePercentageNum < 0 || feePercentageNum > 3) {
            setSubmitError("Creator fee must be a number between 0.00 and 3.00%.");
            setIsSubmitting(false); return;
        }
        const finalAssetSymbol = assetSymbolInput.trim();
        if (!finalAssetSymbol || finalAssetSymbol.length < 3) {
            setSubmitError("Contract Asset Symbol is required (min 3 chars).");
            setIsSubmitting(false); return;
        }
        if (marketType === 'event' && !resolutionDetails.trim()) {
            setSubmitError("Resolution details are required for event markets.");
            setIsSubmitting(false); return;
        }
        if (marketType === 'priceFeed') {
            if (!selectedFeedAddress) {
                setSubmitError("Please select an Oracle Price Feed for price feed markets.");
                setIsSubmitting(false); return;
            }
            if (!priceFeedTargetPrice.trim() || isNaN(parseFloat(priceFeedTargetPrice))) {
                setSubmitError("A valid numeric Target Price is required for price feed markets.");
                setIsSubmitting(false); return;
            }
        }
        if (!expiryDate || !expiryTime) {
            setSubmitError("Betting close date and time (expiry) are required.");
            setIsSubmitting(false); return;
        }
        // --- End Form Validations ---

        try {
            const _isEventMarket = marketType === 'event';
            let _priceFeedAddressContract = ethers.constants.AddressZero;
            let _targetPriceContract;

            if (_isEventMarket) {
                // For event markets, contract's _targetPrice is a placeholder uint256.
                // Actual condition is in resolutionDetails.
                _targetPriceContract = ethers.BigNumber.from(1); 
                // If targetConditionValue is meant to be numeric for event markets:
                // const numericTarget = parseFloat(targetConditionValue);
                // if (isNaN(numericTarget)) {
                //     _targetPriceContract = ethers.BigNumber.from(1); // Default if not a number
                // } else {
                //    _targetPriceContract = ethers.utils.parseUnits(numericTarget.toString(), 0); // Assuming no decimals for this event target
                // }
            } else { // Price Feed Market
                if (!selectedFeedInfo) throw new Error("Price feed information is missing.");
                _priceFeedAddressContract = selectedFeedInfo.address;
                const feedDecimals = selectedFeedInfo.decimals;
                _targetPriceContract = ethers.utils.parseUnits(String(priceFeedTargetPrice).trim(), feedDecimals);
            }

            const fullExpiryString = `${expiryDate}T${expiryTime}:00Z`;
            const expiryDateObj = new Date(fullExpiryString);
            if (isNaN(expiryDateObj.getTime())) throw new Error("Invalid expiry date or time format.");
            const _expiryTimestamp = Math.floor(expiryDateObj.getTime() / 1000);

            const minAllowedExpiry = Math.floor(Date.now() / 1000) + (15 * 60) + 5; // Min 15 mins + buffer
            if (_expiryTimestamp <= minAllowedExpiry) {
                throw new Error(`Expiry time must be at least 15-16 minutes in the future. You set: ${expiryDateObj.toUTCString()}`);
            }

            const _creatorFeeBP = Math.round(parseFloat(creatorFeePercent) * 100);

            console.log("CreateMarketPage_DEBUG: Calling createUserMarket with on-chain params:", {
                _assetSymbol: finalAssetSymbol, _priceFeedAddress: _priceFeedAddressContract, 
                _targetPrice: _targetPriceContract.toString(), _expiryTimestamp, 
                _isEventMarket, _creatorFeeBP, listingFeeToSend: listingFeeWei.toString()
            });
            // ... (OFF-CHAIN INFO LOG) ...

            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.createUserMarket(
                finalAssetSymbol, _priceFeedAddressContract, _targetPriceContract,
                _expiryTimestamp, _isEventMarket, _creatorFeeBP,
                { value: listingFeeWei }
            );

            setSuccessMessage(`Market creation transaction sent: ${tx.hash}. Waiting for confirmation...`);
            await tx.wait(1);

            const newMarketIdBN = await predictionContractInstance.nextMarketId();
            const newMarketId = newMarketIdBN.sub(1).toString();

            setSuccessMessage(`Market "${finalAssetSymbol}" (ID: ${newMarketId}) created successfully! Tx: ${tx.hash}. Redirecting...`);
            console.log("CreateMarketPage_DEBUG: PiOracle Admin - User Market Created Successfully:", { /* ...admin log object... */});
            
            resetForm();
            setTimeout(() => {
                console.log("CreateMarketPage_DEBUG: Navigating to /predictions NOW!");
                navigate('/predictions');
            }, 3000);

        } catch (err) {
            console.error("CreateMarketPage_DEBUG: Error creating market:", err);
            const reason = err.reason || err.data?.message || err.message || "Failed to create market.";
            setSubmitError(`Error: ${reason}`);
        } finally {
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
                    <div className="page-centered info-message" style={{padding: '40px 20px'}}>
                        <p>Please connect your wallet to create a market.</p>
                        <ConnectWalletButton /> 
                    </div>
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
                            {/* Market Type */}
                            <div className="form-group">
                                <label htmlFor="marketType">Market Type:</label>
                                <select id="marketType" value={marketType} onChange={(e) => { setMarketType(e.target.value); setIsSymbolManuallyEdited(false); }}>
                                    <option value="event">Event Market (Resolved by PiOracle Admin)</option>
                                    <option value="priceFeed">Price Feed Market (Chainlink Oracle)</option>
                                </select>
                            </div>

                            {/* Question Core */}
                            <div className="form-group">
                                <label htmlFor="questionCore">Brief Market Question Core:</label>
                                <input type="text" id="questionCore" value={questionCore} onChange={e => {setQuestionCore(e.target.value); setIsSymbolManuallyEdited(false);}} placeholder="e.g., PI Coin price will be above" maxLength={100} required/>
                                <small>Example: "Ethereum price will be below", "Election X winner will be"</small>
                            </div>
                            
                            {/* Target Value (Conditional) */}
                            {marketType === 'priceFeed' ? (
                                <div className="form-group">
                                    <label htmlFor="priceFeedTargetPrice">Target Price for {selectedFeedInfo?.name || 'Selected Feed'}:</label>
                                    <input 
                                        type="number" // Use number for price
                                        id="priceFeedTargetPrice" 
                                        value={priceFeedTargetPrice}
                                        onChange={e => {setPriceFeedTargetPrice(e.target.value); setIsSymbolManuallyEdited(false);}}
                                        placeholder={`e.g., 120000 (for $120,000.00)`} 
                                        required 
                                        step="any" // Allow decimals
                                    />
                                     <small>Enter the price without currency symbols. Decimals handled by selected feed.</small>
                                </div>
                            ) : ( // Event Market
                                <div className="form-group">
                                    <label htmlFor="targetConditionValue">Descriptive Target/Condition:</label>
                                    <input 
                                        type="text" 
                                        id="targetConditionValue" 
                                        value={targetConditionValue}
                                        onChange={e => {setTargetConditionValue(e.target.value); setIsSymbolManuallyEdited(false);}}
                                        placeholder="e.g., YES, CandidateA, 0.75" 
                                        required 
                                    />
                                    <small>For YES/NO, type YES. For specific outcomes, describe here and detail in Resolution Source.</small>
                                </div>
                            )}
                            
                            {/* Asset Symbol */}
                            <div className="form-group">
                                <label htmlFor="assetSymbolInput">Contract Asset Symbol (Auto-generated, Editable):</label>
                                <div style={{display: 'flex', alignItems: 'center'}}>
                                    <input type="text" id="assetSymbolInput" value={assetSymbolInput} onChange={e => { setAssetSymbolInput(e.target.value.toUpperCase().replace(/ /g,'_').replace(/[^A-Z0-9_]/g, '')); setIsSymbolManuallyEdited(true); }} placeholder="AUTO_GENERATED_SYMBOL" required maxLength={60} style={{flexGrow: 1, marginRight: '10px'}}/>
                                    <button type="button" onClick={() => setIsSymbolManuallyEdited(false)} className="button secondary">Regenerate</button>
                                </div>
                                <small>Max 60 chars, A-Z, 0-9, underscores. Must be unique on-chain.</small>
                            </div>

                            {/* Price Feed Selection (Conditional) */}
                            {marketType === 'priceFeed' && (
                                <div className="form-group">
                                    <label htmlFor="selectedFeedAddressInput">Select Oracle Price Feed:</label>
                                    <select 
                                        id="selectedFeedAddressInput" 
                                        value={selectedFeedAddress} 
                                        onChange={(e) => {
                                            const newAddress = e.target.value;
                                            setSelectedFeedAddress(newAddress); 
                                            setSelectedFeedInfo(SUPPORTED_PRICE_FEEDS.find(f => f.address === newAddress) || null); 
                                            setIsSymbolManuallyEdited(false);
                                        }} 
                                        required={marketType === 'priceFeed'}
                                    >
                                        <option value="">-- Select a Price Feed --</option>
                                        {SUPPORTED_PRICE_FEEDS.map(feed => (
                                            <option key={feed.address} value={feed.address}>
                                                {feed.name} ({feed.symbolPrefix})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Resolution Details (Conditional for Event Market) */}
                            {marketType === 'event' && (
                                <div className="form-group">
                                    <label htmlFor="resolutionDetails">Resolution Details & Source of Truth (Required for Event Markets):</label>
                                    <textarea id="resolutionDetails" value={resolutionDetails} onChange={(e) => setResolutionDetails(e.target.value)} placeholder="e.g., Outcome based on official results from [website/authority] published by [date/time]. This market asks 'Will X happen?', so a YES outcome means X happened." rows={4} required={marketType === 'event'}/>
                                    <small>Be very specific. PiOracle admin will use this and publicly verifiable sources to resolve.</small>
                                </div>
                            )}
                            
                            {/* Betting Close Date & Time */}
                            <div className="form-group form-group-inline">
                                <div>
                                    <label htmlFor="expiryDate">Betting Closes On (UTC Date):</label>
                                    <input type="date" id="expiryDate" value={expiryDate} onChange={(e) => {setExpiryDate(e.target.value); setIsSymbolManuallyEdited(false);}} required />
                                </div>
                                <div>
                                    <label htmlFor="expiryTime">Betting Closes At (UTC Time):</label>
                                    <input type="time" id="expiryTime" value={expiryTime} onChange={(e) => {setExpiryTime(e.target.value); setIsSymbolManuallyEdited(false);}} defaultValue="23:59" required />
                                </div>
                            </div>

                            {/* Creator Email */}
                            <div className="form-group">
                                <label htmlFor="creatorEmail">Your Email (Optional - for market communication):</label>
                                <input type="email" id="creatorEmail" value={creatorEmail} onChange={(e) => setCreatorEmail(e.target.value)} placeholder="yourname@example.com" maxLength={100}/>
                                <small>We may use this to contact you about your market, especially if it's an event market needing clarification for resolution. This email will NOT be stored on the blockchain.</small>
                            </div>

                            {/* Creator Fee */}
                            <div className="form-group">
                                <label htmlFor="creatorFeePercent">Your Prediction Fee for this Market (0.00% to 3.00%):</label>
                                <input type="number" id="creatorFeePercent" value={creatorFeePercent} onChange={(e) => setCreatorFeePercent(e.target.value)} min="0" max="3" step="0.01" required/>
                                <small>This % of each prediction placed on this market will be sent to your connected wallet.</small>
                            </div>

                            {submitError && <ErrorMessage message={submitError} title="Creation Error" />}
                            {successMessage && <p className="form-message type-success">{successMessage}</p>}

                            <button type="submit" disabled={isSubmitting || isFeeLoading || !!feeError || !listingFeeWei || (listingFeeWei && listingFeeWei.isZero())} className="button primary create-market-submit-button">
                                {isSubmitting ? <LoadingSpinner size="small" /> :
                                    isFeeLoading ? "Verifying Fee..." :
                                        feeError ? "Cannot Create (Fee Issue)" :
                                            (listingFeeWei && listingFeeWei.isZero()) ? "Listing Fee is Zero" : 
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