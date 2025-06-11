// pioracle/src/pages/CreateMarketPage.jsx
import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers'; // Needed for constants, BigNumber, utils
import { WalletContext } from './WalletProvider';
import ConnectWalletButton from '../components/common/ConnectWalletButton/ConnectWalletButton'; // Adjusted path
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import './CreateMarketPage.css';

// For price feed selection. Ideally, move to a shared config/constants.js
const SUPPORTED_PRICE_FEEDS = [
    { name: "Bitcoin (BTC/USD)", symbolPrefix: "BTCUSD", address: "0xc907E116054Ad103354f2D350FD2514433D57F6f", decimals: 8 },
    { name: "Ethereum (ETH/USD)", symbolPrefix: "ETHUSD", address: "0xF9680D99D6C9589e2a93a78A04A279e509205945", decimals: 8 },
    { name: "MATIC (MATIC/USD)", symbolPrefix: "MATICUSD", address: "0xAB594600376Ec9fD91F8e885dADF0CE0228dda62", decimals: 8 },
    // Add Pi Coin feed if/when a reliable Chainlink one exists on Polygon Mainnet
    // { name: "Pi Coin (PI/USD)", symbolPrefix: "PIUSD", address: "0xYOUR_PI_COIN_FEED_ADDRESS", decimals: X },
];

function CreateMarketPage() {
    const context = useContext(WalletContext);
    const navigate = useNavigate();

    // Destructure context with fallbacks for initial render safety
    const { 
        walletAddress, 
        contract: predictionContractInstance, 
        signer, 
        connectionStatus,
        connectWallet // For the connect button if user is not connected
    } = context || { connectionStatus: {type: 'info', message: 'Context not ready...'} };

    // Form State
    const [marketType, setMarketType] = useState('event'); // 'event' or 'priceFeed'
    const [questionCore, setQuestionCore] = useState(''); 
    const [targetConditionValue, setTargetConditionValue] = useState(''); // For Event markets: text or number for condition
    
    // Price Feed Market Specific State
    const [selectedFeedInfo, setSelectedFeedInfo] = useState(SUPPORTED_PRICE_FEEDS.length > 0 ? SUPPORTED_PRICE_FEEDS[0] : null);
    const [selectedFeedAddress, setSelectedFeedAddress] = useState(SUPPORTED_PRICE_FEEDS.length > 0 ? SUPPORTED_PRICE_FEEDS[0]?.address : '');
    const [priceFeedTargetPrice, setPriceFeedTargetPrice] = useState(''); // User input for price, e.g., "105000"

    const [assetSymbolInput, setAssetSymbolInput] = useState('');
    const [isSymbolManuallyEdited, setIsSymbolManuallyEdited] = useState(false);
    
    const [expiryDate, setExpiryDate] = useState(''); // YYYY-MM-DD
    const [expiryTime, setExpiryTime] = useState('23:00'); // HH:MM (24-hour format)
    
    const [resolutionDetails, setResolutionDetails] = useState(''); // For Event markets
    const [creatorFeePercent, setCreatorFeePercent] = useState("0.5"); // Default 0.5%
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

    // Fetch Listing Fee
    useEffect(() => {
        const fetchFee = async () => {
            if (predictionContractInstance && typeof predictionContractInstance.marketCreationListingFee === 'function') {
                setIsFeeLoading(true); setFeeError('');
                console.log("CreateMarketPage_DEBUG: Attempting to fetch marketCreationListingFee.");
                try {
                    const feeInWei = await predictionContractInstance.marketCreationListingFee();
                    console.log("CreateMarketPage_DEBUG: Fetched feeInWei:", feeInWei.toString());
                    setListingFeeWei(feeInWei);
                    setListingFeeDisplay(ethers.utils.formatEther(feeInWei) + " MATIC");
                } catch (e) {
                    console.error("CreateMarketPage_DEBUG: Error fetching listing fee:", e);
                    setFeeError("Could not load listing fee.");
                    setListingFeeDisplay("N/A"); setListingFeeWei(null);
                } finally {
                    setIsFeeLoading(false);
                }
            } else {
                setIsFeeLoading(true); setListingFeeDisplay("Contract not ready...");
                if (predictionContractInstance && typeof predictionContractInstance.marketCreationListingFee !== 'function'){
                    setFeeError("Fee function error."); setIsFeeLoading(false);
                } else if (!predictionContractInstance && connectionStatus?.type === 'error' && connectionStatus?.message) {
                    setFeeError(`Wallet/Contract Error: ${connectionStatus.message}`); setIsFeeLoading(false);
                } else if (!predictionContractInstance) {
                    setFeeError("Contract unavailable."); setIsFeeLoading(false);
                }
            }
        };
        // Only fetch if not a major provider error and contract instance seems available or could become available
        if (connectionStatus?.type !== 'error' || predictionContractInstance) {
            fetchFee();
        } else if (connectionStatus?.message && connectionStatus?.type === 'error') {
            setFeeError(`WalletProvider Error: ${connectionStatus.message}`);
            setIsFeeLoading(false);
            setListingFeeDisplay("N/A");
        }
    }, [predictionContractInstance, connectionStatus?.type, connectionStatus?.message]);

    // Generate Asset Symbol
    const generateSymbol = useCallback(() => {
        if (isSymbolManuallyEdited && assetSymbolInput) return assetSymbolInput;

        let prefix = "EVENT";
        let condition = "ABOVE"; // Default for price, "IS" for general event
        let targetForSymbol = targetConditionValue.replace(/[$.]/g, '').replace(/,/g, '_').substring(0,15);
        let dateStr = "SOMEDATE";

        if (marketType === 'priceFeed' && selectedFeedInfo) {
            prefix = selectedFeedInfo.symbolPrefix;
            targetForSymbol = priceFeedTargetPrice.replace(/[$.]/g, '').replace(/,/g, '_').substring(0,15);
            // condition might be implicit or part of questionCore for price feed
        } else if (marketType === 'event') {
            if (questionCore) {
                const qWords = questionCore.split(' ');
                prefix = qWords[0].substring(0, 10).toUpperCase().replace(/[^A-Z0-9_]/g, '') || "EVENT";
                if (questionCore.toLowerCase().includes("below") || questionCore.toLowerCase().includes("<")) condition = "BELOW";
                else if (questionCore.toLowerCase().includes("equal to") || questionCore.toLowerCase().includes("=")) condition = "EQUAL";
                else condition = "IS"; // More generic for events
            }
            // targetForSymbol for event is already set from targetConditionValue
        }
        
        if (expiryDate) {
            try {
                const date = new Date(expiryDate + "T00:00:00Z");
                const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
                const day = date.getUTCDate();
                dateStr = `${month}${day < 10 ? '0' : ''}${day}`;
            } catch (e) { console.warn("CreateMarketPage_DEBUG: Error parsing expiryDate for symbol:", e); }
        }
        const finalSymbol = `${prefix}_${condition}_${targetForSymbol}_${dateStr}`.toUpperCase().replace(/ /g,'_').replace(/[^A-Z0-9_]/g, '').substring(0, 60);
        return finalSymbol;
    }, [marketType, questionCore, targetConditionValue, selectedFeedInfo, priceFeedTargetPrice, expiryDate, isSymbolManuallyEdited, assetSymbolInput]);

    useEffect(() => {
        if (!isSymbolManuallyEdited) {
            setAssetSymbolInput(generateSymbol());
        }
    }, [generateSymbol, isSymbolManuallyEdited]);

    const resetForm = useCallback(() => { // Wrapped in useCallback
        setMarketType('event');
        setQuestionCore('');
        setTargetConditionValue('');
        setSelectedFeedInfo(SUPPORTED_PRICE_FEEDS.length > 0 ? SUPPORTED_PRICE_FEEDS[0] : null);
        setSelectedFeedAddress(SUPPORTED_PRICE_FEEDS.length > 0 ? SUPPORTED_PRICE_FEEDS[0]?.address : '');
        setPriceFeedTargetPrice('');
        setAssetSymbolInput(''); // Will be regenerated by useEffect
        setIsSymbolManuallyEdited(false);
        setExpiryDate('');
        setExpiryTime('23:00');
        setResolutionDetails('');
        setCreatorFeePercent("0.5");
        setCreatorEmail('');
    }, [SUPPORTED_PRICE_FEEDS]); // Add SUPPORTED_PRICE_FEEDS if its reference could change, though unlikely for a const

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(''); setSuccessMessage(''); setIsSubmitting(true);

        if (!walletAddress || !signer || !predictionContractInstance) {
            setSubmitError("Wallet not connected or contract not ready. Please connect and try again.");
            setIsSubmitting(false); return;
        }
        if (!listingFeeWei || (listingFeeWei && listingFeeWei.isZero() && !(await predictionContractInstance.owner() === walletAddress) )) { // Owner might create free markets
            // This owner check for free markets is an assumption, your contract requires fee > 0
            // Contract actually requires listingFee > 0. If it's zero, it's an issue with contract state or fee fetching.
            setSubmitError("Market listing fee is problematic (not loaded, or zero which is invalid by contract). Cannot create market.");
            if (feeError) setSubmitError(`Market listing fee error: ${feeError}. Cannot create market.`);
            setIsSubmitting(false); return;
        }

        const feePercentageNum = parseFloat(creatorFeePercent);
        if (isNaN(feePercentageNum) || feePercentageNum < 0 || feePercentageNum > 3) {
            setSubmitError("Creator fee must be a number between 0.00 and 3.00%.");
            setIsSubmitting(false); return;
        }
        if (!assetSymbolInput.trim() || assetSymbolInput.trim().length < 3) {
            setSubmitError("Contract Asset Symbol is required (min 3 chars).");
            setIsSubmitting(false); return;
        }
        if (marketType === 'event' && !resolutionDetails.trim()) {
            setSubmitError("Resolution details & Source of Truth are required for event markets.");
            setIsSubmitting(false); return;
        }
        if (marketType === 'priceFeed') {
            if (!selectedFeedAddress || selectedFeedAddress === ethers.constants.AddressZero) {
                setSubmitError("Please select a valid Oracle Price Feed.");
                setIsSubmitting(false); return;
            }
            if (!priceFeedTargetPrice.trim() || isNaN(parseFloat(priceFeedTargetPrice))) {
                setSubmitError("A valid numeric Target Price is required for price feed markets.");
                setIsSubmitting(false); return;
            }
        }
        if (!expiryDate || !expiryTime) {
            setSubmitError("Betting close date and time are required.");
            setIsSubmitting(false); return;
        }

        try {
            const _assetSymbol = assetSymbolInput.trim();
            const _isEventMarket = marketType === 'event';
            let _priceFeedAddressContract = ethers.constants.AddressZero;
            let _targetPriceContract;

            if (_isEventMarket) {
                // For Event Markets, _targetPrice is a uint256. 
                // If targetConditionValue is "YES" or "CandidateA", it cannot be directly used.
                // The contract's example for PIUSD market used 1.
                // For "Trump/Musk" you also used "YES". Let's default to 1 for simple YES outcome.
                // If a numeric target is provided in targetConditionValue for an event, use that.
                const numericTarget = parseFloat(targetConditionValue);
                if (!isNaN(numericTarget)) {
                    _targetPriceContract = ethers.utils.parseUnits(targetConditionValue.trim(), 0); // Assuming whole number for event target price
                } else {
                    _targetPriceContract = ethers.BigNumber.from(1); // Default/placeholder for non-numeric YES/NO event
                }
            } else { // Price Feed Market
                if (!selectedFeedInfo) throw new Error("Price feed information is missing.");
                _priceFeedAddressContract = selectedFeedInfo.address;
                const feedDecimals = selectedFeedInfo.decimals;
                _targetPriceContract = ethers.utils.parseUnits(String(priceFeedTargetPrice).trim().replace(/,/g, ''), feedDecimals);
            }

            const fullExpiryString = `${expiryDate}T${expiryTime}:00Z`;
            const expiryDateObj = new Date(fullExpiryString);
            if (isNaN(expiryDateObj.getTime())) throw new Error("Invalid expiry date or time format.");
            const _expiryTimestamp = Math.floor(expiryDateObj.getTime() / 1000);

            const minAllowedExpiry = Math.floor(Date.now() / 1000) + (16 * 60); // At least 16 minutes from now
            if (_expiryTimestamp <= minAllowedExpiry) {
                throw new Error(`Betting close time must be at least 16 minutes in the future. You set: ${expiryDateObj.toUTCString()}`);
            }

            const _creatorFeeBP = Math.round(feePercentageNum * 100);

            console.log("CreateMarketPage_DEBUG: Calling createUserMarket with on-chain params:", {
                _assetSymbol, _priceFeedAddress: _priceFeedAddressContract, _targetPrice: _targetPriceContract.toString(),
                _expiryTimestamp, _isEventMarket, _creatorFeeBP, listingFeeToSend: listingFeeWei.toString()
            });
            // ... (OFF-CHAIN INFO LOG) ...

            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.createUserMarket(
                _assetSymbol, _priceFeedAddressContract, _targetPriceContract,
                _expiryTimestamp, _isEventMarket, _creatorFeeBP,
                { value: listingFeeWei } // This is the actual fee sent from the contract's state
            );

            setSuccessMessage(`Market creation transaction sent: ${tx.hash}. Waiting for confirmation...`);
            await tx.wait(1);

            const newMarketIdBN = await predictionContractInstance.nextMarketId();
            const newMarketId = newMarketIdBN.sub(1).toString();

            setSuccessMessage(`Market "${_assetSymbol}" (ID: ${newMarketId}) created successfully! Tx: ${tx.hash}. Redirecting...`);
            console.log("CreateMarketPage_DEBUG: PiOracle Admin - User Market Created Successfully: Market ID:", newMarketId);
            
            resetForm(); // Reset form after successful submission

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
                    <div style={{textAlign: 'center', padding: '40px 20px', border: '1px solid #eee', borderRadius: '8px', margin: '20px auto', maxWidth: '500px' }}>
                        <p className="info-message" style={{marginBottom: '20px', fontSize: '1.1em'}}>
                            Please connect your wallet to create a new prediction market.
                        </p>
                        <ConnectWalletButton />
                    </div>
                ) : (
                    <>
                        <p className="listing-fee-notice" style={{textAlign: 'center', fontWeight: 'bold', margin: '15px 0', padding: '10px', background: '#f0f0f0', borderRadius: '5px'}}>
                            Market Listing Fee: 
                            {isFeeLoading ? <span style={{fontStyle: 'italic'}}>{listingFeeDisplay}</span> : 
                             feeError ? <span style={{color: 'red'}}>{feeError}</span> : 
                             <strong>{listingFeeDisplay}</strong>
                            }
                            <span style={{fontSize: '0.9em', color: '#555'}}> (paid to platform)</span>
                        </p>
                        <form onSubmit={handleSubmit} className="create-market-form">
                            {/* Market Type */}
                            <div className="form-group">
                                <label htmlFor="marketType">Market Type:</label>
                                <select id="marketType" value={marketType} onChange={(e) => { setMarketType(e.target.value); setIsSymbolManuallyEdited(false); resetFormFieldsForMarketType(e.target.value); }}>
                                    <option value="event">Event Market (Resolved by PiOracle Admin)</option>
                                    <option value="priceFeed">Price Feed Market (Resolved by Chainlink Oracle)</option>
                                </select>
                            </div>

                            {/* Question Core */}
                            <div className="form-group">
                                <label htmlFor="questionCore">Brief Market Question Core <span className="required-asterisk">*</span></label>
                                <input type="text" id="questionCore" value={questionCore} onChange={e => {setQuestionCore(e.target.value); setIsSymbolManuallyEdited(false);}} placeholder="e.g., Bitcoin price will be above" maxLength={100} required/>
                                <small>Main part of your market question. Example: "Ethereum price will be below", "Election X winner will be"</small>
                            </div>
                            
                            {/* Target Value Input - now a single input, logic adapts based on marketType */}
                            <div className="form-group">
                                <label htmlFor="targetValueInput">
                                    {marketType === 'priceFeed' ? 
                                        `Target Price for ${selectedFeedInfo?.symbolPrefix || 'Selected Feed'}` : 
                                        "Target Outcome/Value (for Event Market)"} <span className="required-asterisk">*</span>
                                </label>
                                <input 
                                    type={marketType === 'priceFeed' ? "number" : "text"}
                                    id="targetValueInput" 
                                    value={marketType === 'priceFeed' ? priceFeedTargetPrice : targetConditionValue}
                                    onChange={e => {
                                        if (marketType === 'priceFeed') setPriceFeedTargetPrice(e.target.value);
                                        else setTargetConditionValue(e.target.value);
                                        setIsSymbolManuallyEdited(false);
                                    }}
                                    placeholder={marketType === 'priceFeed' ? "e.g., 120000 (for $120,000.00)" : "e.g., YES, or 105250"}
                                    required 
                                />
                                {marketType === 'priceFeed' && <small>Enter the price without currency symbols (e.g., 65000 for $65,000.00). Decimals are handled by the oracle feed settings.</small>}
                                {marketType === 'event' && <small>For YES/NO, enter "YES". For numeric, enter the number (e.g., 105250). This helps form the Asset Symbol.</small>}
                            </div>
                            
                            {/* Asset Symbol */}
                            <div className="form-group">
                                <label htmlFor="assetSymbolInput">Contract Asset Symbol (Auto-generated, Editable): <span className="required-asterisk">*</span></label>
                                <div style={{display: 'flex', alignItems: 'center'}}>
                                    <input type="text" id="assetSymbolInput" value={assetSymbolInput} onChange={e => { setAssetSymbolInput(e.target.value.toUpperCase().replace(/ /g,'_').replace(/[^A-Z0-9_]/g, '')); setIsSymbolManuallyEdited(true); }} placeholder="AUTO_GENERATED_SYMBOL" required maxLength={60} style={{flexGrow: 1, marginRight: '10px'}}/>
                                    <button type="button" onClick={() => setIsSymbolManuallyEdited(false)} className="button secondary">Regenerate</button>
                                </div>
                                <small>Max 60 chars, A-Z, 0-9, underscores. Must be unique on-chain. Example: PIUSD_ABOVE_0_65_JUL01</small>
                            </div>

                            {/* Price Feed Selection (Conditional) */}
                            {marketType === 'priceFeed' && (
                                <div className="form-group">
                                    <label htmlFor="selectedFeedAddress">Select Oracle Price Feed: <span className="required-asterisk">*</span></label>
                                    <select 
                                        id="selectedFeedAddress" 
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
                                    <label htmlFor="resolutionDetails">Resolution Details & Source of Truth: <span className="required-asterisk">*</span></label>
                                    <textarea id="resolutionDetails" value={resolutionDetails} onChange={(e) => setResolutionDetails(e.target.value)} placeholder="Be very specific. E.g., Outcome based on official results from [website/authority] published by [date/time] UTC. For 'Will X happen?', a YES outcome means X happened." rows={5} required={marketType === 'event'}/>
                                    <small>This is crucial for fair resolution by PiOracle Admin.</small>
                                </div>
                            )}
                            
                            {/* Betting Close Date & Time */}
                            <div className="form-group form-group-inline">
                                <div>
                                    <label htmlFor="expiryDate">Betting Closes On (UTC Date): <span className="required-asterisk">*</span></label>
                                    <input type="date" id="expiryDate" value={expiryDate} onChange={(e) => {setExpiryDate(e.target.value); setIsSymbolManuallyEdited(false);}} required />
                                </div>
                                <div>
                                    <label htmlFor="expiryTime">Betting Closes At (UTC Time): <span className="required-asterisk">*</span></label>
                                    <input type="time" id="expiryTime" value={expiryTime} onChange={(e) => {setExpiryTime(e.target.value); setIsSymbolManuallyEdited(false);}} required step="60" />
                                    <small>Time is in UTC.</small>
                                </div>
                            </div>

                            {/* Creator Email */}
                            <div className="form-group">
                                <label htmlFor="creatorEmail">Your Email (Optional - for market communication):</label>
                                <input type="email" id="creatorEmail" value={creatorEmail} onChange={(e) => setCreatorEmail(e.target.value)} placeholder="yourname@example.com" maxLength={100}/>
                                <small>Not stored on-chain. Used if admin needs to clarify resolution details for an event market.</small>
                            </div>

                            {/* Creator Fee */}
                            <div className="form-group">
                                <label htmlFor="creatorFeePercent">Your Creator Fee (0.00% to 3.00%): <span className="required-asterisk">*</span></label>
                                <input type="number" id="creatorFeePercent" value={creatorFeePercent} onChange={(e) => setCreatorFeePercent(e.target.value)} min="0" max="3" step="0.01" required/>
                                <small>This % of each prediction's stake on this market will be sent to your wallet if the market generates fees.</small>
                            </div>

                            {submitError && <ErrorMessage message={submitError} title="Market Creation Error" />}
                            {successMessage && <p className="form-message type-success">{successMessage}</p>}

                            <button type="submit" disabled={isSubmitting || isFeeLoading || !!feeError || !listingFeeWei || (listingFeeWei && listingFeeWei.isZero())} className="button primary create-market-submit-button">
                                {isSubmitting ? <LoadingSpinner size="small" /> :
                                    isFeeLoading ? "Verifying Fee..." :
                                        feeError ? "Fee Error" :
                                            (listingFeeWei && listingFeeWei.isZero()) ? "Invalid Listing Fee (0)" :
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