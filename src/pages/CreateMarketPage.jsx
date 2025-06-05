// pioracle/src/pages/CreateMarketPage.jsx
// pioracle/src/pages/CreateMarketPage.jsx
import React, { useState, useContext, useEffect, useCallback } from 'react'; // Removed useMemo as it wasn't directly used in this file's logic
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { WalletContext } from './WalletProvider'; // Assuming WalletProvider.jsx is in the same ./pages/ directory
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
    const [targetConditionValue, setTargetConditionValue] = useState(''); // For event markets

    const [selectedFeedInfo, setSelectedFeedInfo] = useState(SUPPORTED_PRICE_FEEDS[0]);
    const [selectedFeedAddress, setSelectedFeedAddress] = useState(SUPPORTED_PRICE_FEEDS[0]?.address || ''); // Added state for selectedFeedAddress
    const [priceFeedTargetPrice, setPriceFeedTargetPrice] = useState(''); // For price feed markets

    const [assetSymbolInput, setAssetSymbolInput] = useState('');
    const [isSymbolManuallyEdited, setIsSymbolManuallyEdited] = useState(false);

    const [expiryDate, setExpiryDate] = useState('');
    const [expiryTime, setExpiryTime] = useState('23:00');

    const [resolutionDetails, setResolutionDetails] = useState('');
    const [creatorFeePercent, setCreatorFeePercent] = useState("0.5");
    const [creatorEmail, setCreatorEmail] = useState('');

    const [listingFeeDisplay, setListingFeeDisplay] = useState('Initializing...');
    const [listingFeeWei, setListingFeeWei] = useState(null);
    const [isFeeLoading, setIsFeeLoading] = useState(true);
    const [feeError, setFeeError] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch Listing Fee
    useEffect(() => {
        const fetchFee = async () => {
            if (predictionContractInstance && typeof predictionContractInstance.marketCreationListingFee === 'function') {
                setIsFeeLoading(true); setFeeError('');
                console.log("CreateMarketPage_DEBUG: Attempting to fetch marketCreationListingFee from contract:", predictionContractInstance.address);
                try {
                    const feeInWei = await predictionContractInstance.marketCreationListingFee();
                    console.log("CreateMarketPage_DEBUG: Fetched feeInWei:", feeInWei.toString());
                    setListingFeeWei(feeInWei);
                    setListingFeeDisplay(ethers.utils.formatEther(feeInWei) + " MATIC");
                } catch (e) {
                    console.error("CreateMarketPage_DEBUG: Error fetching listing fee:", e);
                    setFeeError("Could not load listing fee from contract.");
                    setListingFeeDisplay("N/A"); setListingFeeWei(null);
                } finally {
                    setIsFeeLoading(false);
                }
            } else {
                setIsFeeLoading(true); setListingFeeDisplay("Waiting for contract...");
                if (predictionContractInstance && typeof predictionContractInstance.marketCreationListingFee !== 'function') {
                    setFeeError("Fee function missing. ABI issue?"); setIsFeeLoading(false);
                } else if (!predictionContractInstance && connectionStatus?.type === 'error' && connectionStatus?.message) {
                    setFeeError(`Wallet/Contract Error: ${connectionStatus.message}`); setIsFeeLoading(false);
                } else if (!predictionContractInstance) {
                    setFeeError("Contract not available."); setIsFeeLoading(false);
                }
            }
        };

        if (connectionStatus?.type !== 'error') { // Only fetch if no provider-level error
            fetchFee();
        } else if (connectionStatus?.message) {
            setFeeError(`WalletProvider Error: ${connectionStatus.message}`);
            setIsFeeLoading(false);
            setListingFeeDisplay("N/A");
        }
    }, [predictionContractInstance, connectionStatus?.type, connectionStatus?.message]);

    // Generate Asset Symbol
    const generateSymbol = useCallback(() => {
        if (isSymbolManuallyEdited && assetSymbolInput) return assetSymbolInput;

        let prefix = "EVENT";
        let condition = "ABOVE";
        let targetForSymbol = targetConditionValue.replace(/[$.]/g, '').replace(/,/g, '_');
        let dateStr = "SOMEDATE";

        if (marketType === 'priceFeed' && selectedFeedInfo) {
            prefix = selectedFeedInfo.symbolPrefix;
            targetForSymbol = priceFeedTargetPrice.replace(/[$.]/g, '').replace(/,/g, '_');
        } else if (marketType === 'event' && questionCore) {
            const qWords = questionCore.split(' ');
            prefix = qWords[0].substring(0, 10).toUpperCase().replace(/[^A-Z0-9_]/g, '') || "EVENT"; // Allow underscore
            if (questionCore.toLowerCase().includes("below") || questionCore.toLowerCase().includes("<")) condition = "BELOW";
            else if (questionCore.toLowerCase().includes("equal to") || questionCore.toLowerCase().includes("=")) condition = "EQUAL";
        }

        if (expiryDate) {
            try {
                const date = new Date(expiryDate + "T00:00:00Z"); // Ensure parsing as UTC date part
                const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
                const day = date.getUTCDate(); // Use getUTCDate()
                dateStr = `${month}${day < 10 ? '0' : ''}${day}`;
            } catch (e) { console.warn("CreateMarketPage_DEBUG: Error parsing expiryDate for symbol:", e); }
        }
        const finalSymbol = `${prefix}_${condition}_${targetForSymbol}_${dateStr}`.toUpperCase().replace(/ /g, '_').replace(/[^A-Z0-9_]/g, ''); // Final cleanup
        return finalSymbol.substring(0, 60);
    }, [marketType, questionCore, targetConditionValue, selectedFeedInfo, priceFeedTargetPrice, expiryDate, isSymbolManuallyEdited, assetSymbolInput]);

    useEffect(() => {
        if (!isSymbolManuallyEdited) {
            setAssetSymbolInput(generateSymbol());
        }
    }, [generateSymbol, isSymbolManuallyEdited]);

    const resetForm = () => {
        setMarketType('event');
        setQuestionCore('');
        setTargetConditionValue('');
        setSelectedFeedInfo(SUPPORTED_PRICE_FEEDS[0]);
        setSelectedFeedAddress(SUPPORTED_PRICE_FEEDS[0]?.address || '');
        setPriceFeedTargetPrice('');
        setAssetSymbolInput('');
        setIsSymbolManuallyEdited(false);
        setExpiryDate('');
        setExpiryTime('23:00');
        setResolutionDetails('');
        setCreatorFeePercent("0.5");
        setCreatorEmail('');
        // Don't reset fee display/error here, it's fetched from contract
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        setSuccessMessage('');
        setIsSubmitting(true);

        if (!walletAddress || !signer || !predictionContractInstance) {
            setSubmitError("Wallet not connected or contract not ready.");
            setIsSubmitting(false); return;
        }
        if (!listingFeeWei || listingFeeWei.isZero()) { // Check if fee is zero, contract requires > 0
            setSubmitError("Market listing fee is not set or is zero. Cannot create market.");
             if (feeError) setSubmitError(`Market listing fee error: ${feeError}. Cannot create market.`);
            setIsSubmitting(false); return;
        }


        // --- Form Validations ---
        const feePercentageNum = parseFloat(creatorFeePercent);
        if (isNaN(feePercentageNum) || feePercentageNum < 0 || feePercentageNum > 3) {
            setSubmitError("Creator fee must be a number between 0.00 and 3.00%.");
            setIsSubmitting(false); return;
        }
        if (!assetSymbolInput.trim() || assetSymbolInput.trim().length < 3) { // Basic length check
            setSubmitError("Contract Asset Symbol is required (min 3 chars).");
            setIsSubmitting(false); return;
        }
        if (marketType === 'event' && !resolutionDetails.trim()) {
            setSubmitError("Resolution details are required for event markets.");
            setIsSubmitting(false); return;
        }
        if (marketType === 'priceFeed') {
            if (!selectedFeedAddress) {
                setSubmitError("Please select an Oracle Price Feed.");
                setIsSubmitting(false); return;
            }
            if (!priceFeedTargetPrice.trim()) {
                setSubmitError("Target price is required for price feed markets.");
                setIsSubmitting(false); return;
            }
        }
        if (!expiryDate || !expiryTime) {
            setSubmitError("Betting close date and time are required.");
            setIsSubmitting(false); return;
        }
        // --- End Form Validations ---


        try {
            const _assetSymbol = assetSymbolInput.trim();
            const _isEventMarket = marketType === 'event';
            let _priceFeedAddressContract = ethers.constants.AddressZero;
            let _targetPriceContract; // Will be set based on market type

            if (_isEventMarket) {
                // For event markets, targetPrice might not be a number.
                // Your contract expects uint256. If targetConditionValue is text like "CandidateA",
                // this will fail. The contract needs to handle this, or the UI needs to ensure
                // targetConditionValue is numeric if it's always passed to a uint256 _targetPrice.
                // For now, assuming if it's an event, targetPrice in contract might be a placeholder or
                // related to how you'd structure outcomes. Let's use 0 or 1 for now.
                // If targetConditionValue IS a number for event markets (e.g. "score will be above X")
                // then parse it. Otherwise, a placeholder.
                // This logic needs to align perfectly with your contract's intent for _targetPrice for event markets.
                // Given your contract takes uint256 _targetPrice, it must be a number.
                // If event outcomes are YES/NO based on a non-numeric condition described in resolutionDetails,
                // then _targetPrice for event markets is somewhat arbitrary.
                // Your previous successful transaction sent 1. Let's stick to that for event markets.
                _targetPriceContract = ethers.BigNumber.from(1); 
                // If 'targetConditionValue' for event markets should be numeric and used as _targetPrice:
                // try {
                //   _targetPriceContract = ethers.utils.parseUnits(String(targetConditionValue).trim(), 0); // Assuming integer
                // } catch (parseErr) {
                //   throw new Error("Target Outcome Value for event market must be a whole number if used as targetPrice.");
                // }
            } else { // Price Feed Market
                if (!selectedFeedInfo) throw new Error("Price feed info not available.");
                _priceFeedAddressContract = selectedFeedInfo.address;
                const feedDecimals = selectedFeedInfo.decimals;
                _targetPriceContract = ethers.utils.parseUnits(String(priceFeedTargetPrice).trim(), feedDecimals);
            }

            const fullExpiryString = `${expiryDate}T${expiryTime}:00Z`; // Assume input is local, convert to UTC
            const expiryDateObj = new Date(fullExpiryString);
            if (isNaN(expiryDateObj.getTime())) {
                throw new Error("Invalid expiry date or time format.");
            }
            const _expiryTimestamp = Math.floor(expiryDateObj.getTime() / 1000);

            const minAllowedExpiry = Math.floor(Date.now() / 1000) + (15 * 60) + 60; // 16 mins from now
            if (_expiryTimestamp <= minAllowedExpiry) {
                throw new Error(`Expiry time must be at least 16 minutes in the future. You set: ${expiryDateObj.toUTCString()}`);
            }

            const _creatorFeeBP = Math.round(parseFloat(creatorFeePercent) * 100);

            console.log("CreateMarketPage_DEBUG: Calling createUserMarket with on-chain params:", {
                _assetSymbol,
                _priceFeedAddress: _priceFeedAddressContract,
                _targetPrice: _targetPriceContract.toString(),
                _expiryTimestamp,
                _isEventMarket,
                _creatorFeeBP,
                listingFeeToSend: listingFeeWei.toString()
            });
            console.log("CreateMarketPage_DEBUG: OFF-CHAIN INFO FOR ADMIN - Creator Email:", creatorEmail, "Resolution Details:", resolutionDetails, "Raw Question Core:", questionCore, "Raw TargetConditionValue:", targetConditionValue);

            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.createUserMarket(
                _assetSymbol,
                _priceFeedAddressContract,
                _targetPriceContract,
                _expiryTimestamp,
                _isEventMarket,
                _creatorFeeBP,
                { value: listingFeeWei }
            );

            setSuccessMessage(`Market creation transaction sent: ${tx.hash}. Waiting for confirmation...`);
            await tx.wait(1);

            const newMarketIdBN = await predictionContractInstance.nextMarketId();
            const newMarketId = newMarketIdBN.sub(1).toString();

            setSuccessMessage(`Market "${_assetSymbol}" (ID: ${newMarketId}) created successfully! Tx: ${tx.hash}. Redirecting...`);

            console.log("CreateMarketPage_DEBUG: PiOracle Admin - User Market Created Successfully:");
            console.log("  Market ID:", newMarketId);
            // ... (other admin logs) ...

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


    // JSX for the form (largely unchanged from your version, but ensure selectedFeedAddress is handled)
    // Make sure the value for the price feed select is `selectedFeedAddress`
    // and its onChange updates `setSelectedFeedAddress` and `setSelectedFeedInfo`
    return (
        <>
            <title>Create New Prediction Market | PiOracle</title>
            {/* ... meta description ... */}
            <div className="page-container create-market-page">
                <h2>Create Your Prediction Market</h2>
                {!walletAddress ? (
                    <p className="info-message" style={{ textAlign: 'center', padding: '20px' }}>Please connect your wallet to create a market.</p>
                ) : (
                    <>
                        <p className="listing-fee-notice" style={{ textAlign: 'center', fontWeight: 'bold', margin: '15px 0' }}>
                            Market Listing Fee:
                            {isFeeLoading ? <span style={{ fontStyle: 'italic' }}>{listingFeeDisplay}</span> :
                                feeError ? <span style={{ color: 'red' }}>{feeError}</span> :
                                    <strong>{listingFeeDisplay}</strong>
                            }
                            (paid to platform)
                        </p>
                        <form onSubmit={handleSubmit} className="create-market-form">
                            {/* Market Type */}
                            <div className="form-group">
                                <label htmlFor="marketType">Market Type:</label>
                                <select id="marketType" value={marketType} onChange={(e) => { setMarketType(e.target.value); setIsSymbolManuallyEdited(false); }}>
                                    <option value="event">Event Market (Resolved by PiOracle Admin based on your details)</option>
                                    <option value="priceFeed">Price Feed Market (Resolved by Chainlink Oracle)</option>
                                </select>
                            </div>

                            {/* Question Core */}
                            <div className="form-group">
                                <label htmlFor="questionCore">Brief Market Question Core (e.g., "Bitcoin price will be above", "Pi Coin price will be below"): </label>
                                <input type="text" id="questionCore" value={questionCore} onChange={e => setQuestionCore(e.target.value)} placeholder="e.g., Pi Coin price will be above" maxLength={100} required />
                                <small>This helps structure the market. Be clear and concise. Example: "Ethereum price will be below", "Election X winner will be"</small>
                            </div>
                            
                            {/* Target Value - Conditional Label and Input */}
                            <div className="form-group">
                                <label htmlFor="targetInput">
                                    {marketType === 'priceFeed' ? 
                                        `Target Price for ${selectedFeedInfo?.symbolPrefix || 'Selected Feed'}` : 
                                        "Target Outcome Value (e.g., for numeric events like 'Score > 10', enter 10. For text like 'CandidateA wins', describe fully in Resolution Details.)"}
                                </label>
                                <input 
                                    type="text" 
                                    id="targetInput" 
                                    value={marketType === 'priceFeed' ? priceFeedTargetPrice : targetConditionValue}
                                    onChange={e => {
                                        if (marketType === 'priceFeed') setPriceFeedTargetPrice(e.target.value);
                                        else setTargetConditionValue(e.target.value);
                                        setIsSymbolManuallyEdited(false);
                                    }}
                                    placeholder={marketType === 'priceFeed' ? "e.g., 120000 (for $120,000.00)" : "e.g., 10 (for Score > 10) or text"}
                                    required 
                                />
                                {marketType === 'priceFeed' && <small>Enter the price without currency symbols e.g., 110000 for $110,000.00. Decimals will be handled based on selected feed.</small>}
                                {marketType === 'event' && <small>If your event resolves to a number, enter it. If text, ensure Resolution Details are very clear how this value relates to YES/NO.</small>}
                            </div>

                            {/* Asset Symbol */}
                            <div className="form-group">
                                <label htmlFor="assetSymbolInput">Contract Asset Symbol (Auto-generated, Editable):</label>
                                <div style={{display: 'flex', alignItems: 'center'}}>
                                    <input type="text" id="assetSymbolInput" value={assetSymbolInput} onChange={e => { setAssetSymbolInput(e.target.value.toUpperCase().replace(/ /g,'_').replace(/[^A-Z0-9_]/g, '')); setIsSymbolManuallyEdited(true); }} placeholder="AUTO_GENERATED_SYMBOL" required maxLength={60} style={{flexGrow: 1, marginRight: '10px'}}/>
                                    <button type="button" onClick={() => {setIsSymbolManuallyEdited(false); }} className="button secondary">Regenerate</button>
                                </div>
                                <small>Max 60 chars, A-Z, 0-9, underscores. Must be unique on-chain. Example: PIUSD_PRICE_ABOVE_0_75_JUL01</small>
                            </div>

                            {/* Price Feed Selection (Conditional) */}
                            {marketType === 'priceFeed' && (
                                <div className="form-group">
                                    <label htmlFor="selectedFeedAddress">Select Oracle Price Feed:</label>
                                    <select 
                                        id="selectedFeedAddress" 
                                        value={selectedFeedAddress} 
                                        onChange={(e) => {
                                            setSelectedFeedAddress(e.target.value); 
                                            setSelectedFeedInfo(SUPPORTED_PRICE_FEEDS.find(f => f.address === e.target.value) || null); 
                                            setIsSymbolManuallyEdited(false);
                                        }} 
                                        required={marketType === 'priceFeed'}
                                    >
                                        <option value="">-- Select a Price Feed --</option>
                                        {SUPPORTED_PRICE_FEEDS.map(feed => (
                                            <option key={feed.address} value={feed.address}>
                                                {feed.name}
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
                                    <input type="time" id="expiryTime" value={expiryTime} onChange={(e) => {setExpiryTime(e.target.value); setIsSymbolManuallyEdited(false);}} required />
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

                            {/* Submit Button */}
                            <button type="submit" disabled={isSubmitting || isFeeLoading || !!feeError || !listingFeeWei || (listingFeeWei && listingFeeWei.isZero())} className="button primary create-market-submit-button">
                                {isSubmitting ? <LoadingSpinner size="small" /> :
                                    isFeeLoading ? "Verifying Fee..." :
                                        feeError ? "Cannot Create (Fee Issue)" :
                                            (listingFeeWei && listingFeeWei.isZero()) ? "Listing Fee is Zero (Cannot Create)" : // Added check for zero fee
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