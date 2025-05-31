// pioracle/src/pages/CreateMarketPage.jsx
import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers'; // Using Ethers v5 as per your project
import { WalletContext } from '../context/WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import './CreateMarketPage.css'; // Create this CSS file

const SUPPORTED_PRICE_FEEDS = [
    { name: "Bitcoin (BTC/USD)", symbolPrefix: "BTCUSD", address: "0xc907E116054Ad103354f2D350FD2514433D57F6f", decimals: 8 },
    { name: "Ethereum (ETH/USD)", symbolPrefix: "ETHUSD", address: "0xF9680D99D6C9589e2a93a78A04A279e509205945", decimals: 8 },
    { name: "MATIC (MATIC/USD)", symbolPrefix: "MATICUSD", address: "0xAB594600376Ec9fD91F8e885dADF0CE0228dda62", decimals: 8 },
];

function CreateMarketPage() {
    const { walletAddress, contract: predictionContractInstance, signer } = useContext(WalletContext);
    const navigate = useNavigate();

    const [marketType, setMarketType] = useState('event');
    const [questionPrompt, setQuestionPrompt] = useState(''); // e.g., "price of Bitcoin will be above"
    const [targetValue, setTargetValue] = useState(''); // e.g., "120000" or "0.75"
    const [targetUnit, setTargetUnit] = useState('USD'); // e.g., USD
    const [selectedFeedInfo, setSelectedFeedInfo] = useState(SUPPORTED_PRICE_FEEDS[0]); // Default to BTC or first
    
    const [expiryDate, setExpiryDate] = useState(''); // YYYY-MM-DD
    const [expiryTime, setExpiryTime] = useState('23:00');   // HH:MM (UTC)

    const [resolutionDetails, setResolutionDetails] = useState('');
    const [creatorFeePercent, setCreatorFeePercent] = useState("0.5"); // Default 0.5%

    const [generatedSymbol, setGeneratedSymbol] = useState('');
    const [isSymbolManuallyEdited, setIsSymbolManuallyEdited] = useState(false);

    const [listingFeeDisplay, setListingFeeDisplay] = useState('Loading...');
    const [listingFeeWei, setListingFeeWei] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch listing fee
    useEffect(() => {
        const fetchFee = async () => {
            if (predictionContractInstance && predictionContractInstance.marketCreationListingFee) {
                try {
                    const fee = await predictionContractInstance.marketCreationListingFee();
                    setListingFeeWei(fee);
                    setListingFeeDisplay(ethers.utils.formatEther(fee) + " MATIC");
                } catch (e) { console.error("Error fetching listing fee", e); setListingFeeDisplay("Error");}
            }
        };
        fetchFee();
    }, [predictionContractInstance]);

    // Auto-generate symbol (Simplified - needs improvement)
    const updateGeneratedSymbol = useCallback(() => {
        if (isSymbolManuallyEdited) return; // Don't override manual edits

        let prefix = "EVENT";
        let condition = "ABOVE"; // Assume "greater than or equal to"
        let targetForSymbol = targetValue.replace('.', '_'); // e.g., 0_75
        let dateStr = "SOMEDATE";

        if (marketType === 'priceFeed' && selectedFeedInfo) {
            prefix = selectedFeedInfo.symbolPrefix; // BTCUSD, ETHUSD
        } else if (marketType === 'event' && questionPrompt) {
             // Very basic attempt to get an asset from question
            const firstWord = questionPrompt.split(' ')[0].toUpperCase();
            prefix = firstWord.length > 0 && firstWord.length < 10 ? firstWord : "EVENT";
        }
        
        if (expiryDate) {
            try {
                const date = new Date(expiryDate + "T00:00:00Z");
                const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
                const day = date.getDate();
                dateStr = `${month}${day < 10 ? '0' : ''}${day}`;
            } catch (e) { /* ignore */ }
        }
        setGeneratedSymbol(`${prefix}_PRICE_${condition}_${targetForSymbol}_${dateStr}`);
    }, [marketType, questionPrompt, targetValue, selectedFeedInfo, expiryDate, isSymbolManuallyEdited]);

    useEffect(() => {
        updateGeneratedSymbol();
    }, [updateGeneratedSymbol]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccessMessage(''); setIsLoading(true);

        if (!walletAddress || !signer || !predictionContractInstance || !listingFeeWei) {
            setError("Wallet not connected, or contract/listing fee not ready."); setIsLoading(false); return;
        }
        // Robust Validations Needed Here!
        if (parseFloat(creatorFeePercent) < 0 || parseFloat(creatorFeePercent) > 3) {
            setError("Creator fee must be between 0.00 and 3.00%."); setIsLoading(false); return;
        }
        if (!generatedSymbol) {
            setError("Asset symbol is required and could not be generated. Please refine question/details."); setIsLoading(false); return;
        }
        if (marketType === 'event' && !resolutionDetails.trim()) {
            setError("Resolution details are required for event markets."); setIsLoading(false); return;
        }
        if (marketType === 'priceFeed' && (!selectedFeedInfo || !targetValue.trim())) {
            setError("Price feed and target price are required for price feed markets."); setIsLoading(false); return;
        }
        if (!expiryDate || !expiryTime) {
            setError("Betting close date and time are required."); setIsLoading(false); return;
        }

        try {
            const _assetSymbol = generatedSymbol;
            const _isEventMarket = marketType === 'event';
            let _priceFeedAddress = ethers.constants.AddressZero;
            let _targetPriceContract = ethers.BigNumber.from(1); // Default for event

            if (!_isEventMarket) {
                _priceFeedAddress = selectedFeedInfo.address;
                _targetPriceContract = ethers.utils.parseUnits(targetValue, selectedFeedInfo.decimals);
            }

            const fullExpiryString = `${expiryDate}T${expiryTime}:00Z`;
            const _expiryTimestamp = Math.floor(new Date(fullExpiryString).getTime() / 1000);
            
            const nowPlus15Min = Math.floor(Date.now() / 1000) + (15 * 60);
            if (_expiryTimestamp <= nowPlus15Min) {
                 setError("Betting close time must be at least 15 minutes in the future from now.");
                 setIsLoading(false); return;
            }

            const _creatorFeeBP = Math.round(parseFloat(creatorFeePercent) * 100);

            logInfo("Calling createUserMarket with params:", {
                _assetSymbol, _priceFeedAddress, _targetPrice: _targetPriceContract.toString(),
                _expiryTimestamp, _isEventMarket, _creatorFeeBP, listingFee: listingFeeWei.toString()
            });

            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.createUserMarket(
                _assetSymbol, _priceFeedAddress, _targetPriceContract,
                _expiryTimestamp, _isEventMarket, _creatorFeeBP,
                { value: listingFeeWei }
            );
            setSuccessMessage(`Market creation tx sent: ${tx.hash}. Waiting for confirmation...`);
            await tx.wait(1);
            setSuccessMessage(`Market "${_assetSymbol}" created successfully! It will appear on the markets list soon. Tx: ${tx.hash}`);
            // Reset form or navigate
            // setQuestionPrompt(''); setTargetValue(''); /* ... etc ... */
            // navigate('/predictions');
        } catch (err) {
            console.error("Error creating market:", err);
            const reason = err.reason || err.data?.message || err.message || "Failed to create market.";
            setError(`Error: ${reason}`);
        }
        setIsLoading(false);
    };
    
    // ... (JSX for the form - similar to my previous detailed CreateMarketPage.jsx example)
    // Make sure to use the state variables defined here (questionPrompt, targetValue, etc.)
    // And provide an input for `assetSymbol` that uses `generatedSymbol` but allows edits (setting isSymbolManuallyEdited)
    return (
        <>
            <title>Create New Prediction Market | PiOracle</title>
            <meta name="description" content="Pioneers and users can create their own prediction markets on PiOracle. Set the terms and earn fees!" />

            <div className="page-container create-market-page">
                <h2>Create Your Prediction Market</h2>
                <p className="listing-fee-notice">Market Listing Fee: <strong>{listingFeeDisplay}</strong> (paid to platform)</p>

                {!walletAddress ? (
                    <p className="info-message">Please connect your wallet to create a market.</p>
                ) : (
                    <form onSubmit={handleSubmit} className="create-market-form">
                        {/* Market Type */}
                        <div className="form-group">
                            <label htmlFor="marketType">Market Type:</label>
                            <select id="marketType" value={marketType} onChange={(e) => setMarketType(e.target.value)}>
                                <option value="event">Event Market (Resolved by PiOracle Admin based on your details)</option>
                                <option value="priceFeed">Price Feed Market (Resolved by Chainlink Oracle)</option>
                            </select>
                        </div>

                        {/* Question Prompt - to help generate symbol and for user understanding */}
                        <div className="form-group">
                            <label htmlFor="questionPrompt">Brief Market Question Core (e.g., "Bitcoin price will be above"): </label>
                            <input type="text" id="questionPrompt" value={questionPrompt} onChange={e => setQuestionPrompt(e.target.value)} placeholder="e.g., Pi Coin price will be above" />
                            <small>Helps structure the market. Example: "Ethereum price below", "Election X winner will be"</small>
                        </div>

                        {/* Target Value (for both types, interpretation differs) */}
                        <div className="form-group">
                            <label htmlFor="targetValue">
                                {marketType === 'priceFeed' ? `Target Price for ${selectedFeedInfo?.symbolPrefix || 'Selected Feed'}` : "Target Condition Value (e.g., 0.75 for $0.75, or candidate name for an election if symbol reflects it)"}
                            </label>
                            <input type="text" id="targetValue" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder={marketType === 'priceFeed' ? "e.g., 120000 (for $120,000)" : "e.g., 0.75 or Trump"} />
                        </div>
                        
                        {/* Asset Symbol - Auto-generated but editable */}
                        <div className="form-group">
                            <label htmlFor="generatedSymbol">Contract Asset Symbol (Auto-generated, Editable):</label>
                            <input 
                                type="text" 
                                id="generatedSymbol" 
                                value={generatedSymbol} 
                                onChange={e => { setGeneratedSymbol(e.target.value); setIsSymbolManuallyEdited(true); }} 
                                placeholder="e.g., BTCUSD_PRICE_ABOVE_120000_JUN15" 
                                required 
                                maxLength={60} // Check contract limits
                            />
                            <button type="button" onClick={() => {setIsSymbolManuallyEdited(false); updateGeneratedSymbol();}} style={{marginLeft:'10px'}}>Regenerate</button>
                            <small>IMPORTANT: Max 60 chars, A-Z, 0-9, underscores. Must be unique. Example: PIUSD_PRICE_ABOVE_0_75_JUL01</small>
                        </div>


                        {/* Conditional: Price Feed Selection */}
                        {marketType === 'priceFeed' && (
                            <div className="form-group">
                                <label htmlFor="selectedFeed">Select Oracle Price Feed:</label>
                                <select id="selectedFeed" value={selectedFeedInfo?.address || ''} onChange={(e) => setSelectedFeedInfo(SUPPORTED_PRICE_FEEDS.find(f => f.address === e.target.value) || null)} required>
                                    <option value="">-- Select a Price Feed --</option>
                                    {SUPPORTED_PRICE_FEEDS.map(feed => (
                                        <option key={feed.address} value={feed.address}>
                                            {feed.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Conditional: Event Market Resolution Details */}
                        {marketType === 'event' && (
                            <div className="form-group">
                                <label htmlFor="resolutionDetails">Resolution Details & Source of Truth (Required for Event Markets):</label>
                                <textarea
                                    id="resolutionDetails" value={resolutionDetails}
                                   onChange={(e) => setResolutionDetails(e.target.value)}
                                    placeholder="e.g., Outcome based on official SpaceX announcements by June 16, 2025. YES if successful orbital launch."
                                    rows={4} required
                                />
                                <small>Be very specific. PiOracle admin will use this and publicly verifiable sources to resolve.</small>
                            </div>
                        )}

                        {/* Expiry Date & Time */}
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

                        {/* Creator Fee */}
                        <div className="form-group">
                            <label htmlFor="creatorFeePercent">Your Prediction Fee for this Market (0.00% to 3.00%):</label>
                            <input
                                type="number" id="creatorFeePercent" value={creatorFeePercent}
                                onChange={(e) => setCreatorFeePercent(e.target.value)}
                                min="0" max="3" step="0.01" required
                            />
                            <small>This % of each prediction placed on this market will be sent to your wallet.</small>
                        </div>

                        {error && <ErrorMessage message={error} />}
                        {successMessage && <p className="form-message type-success">{successMessage}</p>}

                        <button type="submit" disabled={isLoading || !listingFeeWei || listingFeeWei.eq(0)} className="button primary">
                            {isLoading ? <LoadingSpinner size="small" /> : `Create Market & Pay ${listingFeeDisplay} Listing Fee`}
                        </button>
                    </form>
                )}
            </div>
        </>
    );
}
export default CreateMarketPage;