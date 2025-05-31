// pioracle/src/pages/CreateMarketPage.jsx
import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { WalletContext } from '../context/WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import './CreateMarketPage.css'; // Create this CSS file

// Assuming these are defined in your contract or you have a way to fetch them
// For now, let's hardcode some examples. In a real app, fetch from contract or config.
const SUPPORTED_PRICE_FEEDS = [
    { symbol: "BTC/USD", name: "Bitcoin vs USD", address: "0xc907E116054Ad103354f2D350FD2514433D57F6f", decimals: 8 },
    { symbol: "ETH/USD", name: "Ethereum vs USD", address: "0xF9680D99D6C9589e2a93a78A04A279e509205945", decimals: 8 },
    { symbol: "MATIC/USD", name: "MATIC vs USD", address: "0xAB594600376Ec9fD91F8e885dADF0CE0228dda62", decimals: 8 },
    // Add more whitelisted feeds as needed
];

function CreateMarketPage() {
    const { walletAddress, contract: predictionContractInstance, signer, provider, loadedTargetChainIdHex } = useContext(WalletContext);
    const navigate = useNavigate();

    const [marketType, setMarketType] = useState('event'); // 'event' or 'priceFeed'
    const [question, setQuestion] = useState(''); // e.g., "Will Solana (SOL) reach $200 by June 15th?"
    const [assetSymbolForContract, setAssetSymbolForContract] = useState(''); // e.g., SOLUSD_PRICE_ABOVE_200_JUN15
    
    const [selectedFeed, setSelectedFeed] = useState(SUPPORTED_PRICE_FEEDS[0]?.address || '');
    const [targetPrice, setTargetPrice] = useState(''); // Human-readable, e.g., "200" for price feed
    
    const [expiryDate, setExpiryDate] = useState(''); // YYYY-MM-DD
    const [expiryTime, setExpiryTime] = useState('23:00');   // HH:MM (UTC) - For betting close
    
    const [resolutionDetails, setResolutionDetails] = useState(''); // For event markets: "Official results from..."
    const [creatorFeePercent, setCreatorFeePercent] = useState(0.5); // User inputs 0 to 3.00

    const [listingFeeMATIC, setListingFeeMATIC] = useState('Loading...');
    const [listingFeeWei, setListingFeeWei] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch listing fee from contract
    useEffect(() => {
        const fetchListingFee = async () => {
            if (predictionContractInstance) {
                try {
                    const feeInWei = await predictionContractInstance.marketCreationListingFee();
                    setListingFeeWei(feeInWei);
                    setListingFeeMATIC(ethers.utils.formatEther(feeInWei));
                } catch (e) {
                    console.error("Error fetching listing fee:", e);
                    setError("Could not fetch market creation listing fee.");
                    setListingFeeMATIC("Error");
                }
            }
        };
        fetchListingFee();
    }, [predictionContractInstance]);

    // Generate assetSymbol (this is a simplified example, needs to be robust)
    const generateAssetSymbol = useCallback(() => {
        // This logic needs to be very robust based on question, type, target, date
        // Example: "Will [ASSET] be [CONDITION] [TARGET_PRICE] by [DATE_IN_SYMBOL]?"
        // For PIUSD_PRICE_ABOVE_0_7050_MAY30_EOB
        // For now, a placeholder. User might need to help structure this or you derive it.
        if (!question) return '';
        
        let symbol = question.toUpperCase().replace(/[^A-Z0-9]/g, '_'); // Basic sanitization
        symbol = symbol.substring(0, 50); // Truncate
        
        // Add date part from expiryDate (e.g., MAY30)
        if (expiryDate) {
            try {
                const date = new Date(expiryDate + "T00:00:00Z"); // Ensure parsing as UTC
                const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
                const day = date.getDate();
                symbol += `_${month}${day < 10 ? '0' : ''}${day}`;
            } catch (e) { /* ignore date parsing error for symbol */ }
        }
        setAssetSymbolForContract(symbol);
        return symbol; // This is too simplistic, needs a proper parser from 'question'
    }, [question, expiryDate]);

    useEffect(() => {
        // Auto-update symbol preview as user types question or date
        // This is a very basic way, ideally, you'd parse the question more intelligently
        const generated = generateAssetSymbol();
        // setAssetSymbolForContract(generated); // Maybe let user edit this or confirm
    }, [question, expiryDate, generateAssetSymbol]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!walletAddress || !signer || !predictionContractInstance || !listingFeeWei) {
            setError("Wallet not connected or contract not ready.");
            return;
        }
        if (parseFloat(creatorFeePercent) < 0 || parseFloat(creatorFeePercent) > 3) {
            setError("Creator fee must be between 0 and 3.00%.");
            return;
        }
        // More validations needed for all fields!

        setIsLoading(true); setError(''); setSuccessMessage('');

        try {
            // 1. Prepare parameters for smart contract
            const finalAssetSymbol = assetSymbolForContract || generateAssetSymbol(); // Use user input or generate
            if (!finalAssetSymbol) {
                throw new Error("Market question/symbol is required.");
            }

            let priceFeedAddressForContract = ethers.constants.AddressZero; // Ethers v5
            let targetPriceForContract = ethers.BigNumber.from(1); // Symbolic for event markets

            if (marketType === 'priceFeed') {
                if (!selectedFeed) throw new Error("Price feed must be selected for this market type.");
                priceFeedAddressForContract = selectedFeed;
                const feedInfo = SUPPORTED_PRICE_FEEDS.find(f => f.address === selectedFeed);
                if (!feedInfo) throw new Error("Invalid price feed selected.");
                if (isNaN(parseFloat(targetPrice)) || parseFloat(targetPrice) <= 0) throw new Error("Invalid target price for price feed market.");
                // Scale targetPrice according to feed decimals
                targetPriceForContract = ethers.utils.parseUnits(targetPrice, feedInfo.decimals);
            } else { // Event Market
                if (!resolutionDetails.trim()) throw new Error("Resolution details are required for event markets.");
            }

            if (!expiryDate || !expiryTime) throw new Error("Expiry date and time are required.");
            const fullExpiryString = `${expiryDate}T${expiryTime}:00Z`; // Assume time is UTC
            const expiryTimestampForContract = Math.floor(new Date(fullExpiryString).getTime() / 1000);
            if (isNaN(expiryTimestampForContract) || expiryTimestampForContract <= Math.floor(Date.now() / 1000) + (10 * 60)) { // Min 10 mins in future
                throw new Error("Expiry time must be a valid future date/time (at least 10 minutes from now).");
            }

            const creatorFeeBP = Math.round(parseFloat(creatorFeePercent) * 100); // e.g., 0.5% -> 50 BP

            console.log("Calling createUserMarket with:", {
                _assetSymbol: finalAssetSymbol,
                _priceFeedAddress: priceFeedAddressForContract,
                _targetPrice: targetPriceForContract.toString(),
                _expiryTimestamp: expiryTimestampForContract,
                _isEventMarket: marketType === 'event',
                _creatorFeeBP: creatorFeeBP,
                listingFee: listingFeeWei.toString()
            });

            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.createUserMarket(
                finalAssetSymbol,
                priceFeedAddressForContract,
                targetPriceForContract,
                expiryTimestampForContract,
                marketType === 'event',
                creatorFeeBP,
                { value: listingFeeWei } // Send the listing fee
            );

            setSuccessMessage(`Market creation transaction sent: ${tx.hash}. Waiting for confirmation...`);
            await tx.wait(1);
            setSuccessMessage(`Market successfully created! You can view it on the markets page after a refresh. Tx: ${tx.hash}`);
            setIsLoading(false);
            // Optionally navigate to the new market or the markets list
            // navigate('/predictions'); 
        } catch (err) {
            console.error("Error creating market:", err);
            const reason = err.reason || err.data?.message || err.message || "Failed to create market.";
            setError(`Error: ${reason}`);
            setIsLoading(false);
        }
    };

    if (!walletAddress) {
        return (
            <div className="page-container create-market-page">
                <h2>Create New Prediction Market</h2>
                <p className="info-message">Please connect your wallet to create a market.</p>
            </div>
        );
    }
    
    return (
        <>
            <title>Create Prediction Market | PiOracle</title>
            <meta name="description" content="Create your own prediction markets on PiOracle. Set the terms, fees, and share your foresight with the community." />

            <div className="page-container create-market-page">
                <h2>Create New Prediction Market</h2>
                <p>Listing Fee: {listingFeeMATIC} MATIC (This fee goes to the platform)</p>

                <form onSubmit={handleSubmit} className="create-market-form">
                    {/* Market Type Selection */}
                    <div className="form-group">
                        <label>Market Type:</label>
                        <select value={marketType} onChange={(e) => setMarketType(e.target.value)}>
                            <option value="event">Event Market (Manually Resolved by PiOracle Admin)</option>
                            <option value="priceFeed">Price Feed Market (Chainlink Oracle)</option>
                        </select>
                    </div>

                    {/* Market Question / Description */}
                    <div className="form-group">
                        <label htmlFor="question">Market Question / Full Description:</label>
                        <input
                            type="text" id="question" value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="e.g., Will Bitcoin (BTC/USD) price be >= $120,000 by July 1st, 2025, 12:00 PM UTC?"
                            required maxLength={200}
                        />
                        <small>This helps generate the `assetSymbol` for the contract. Be descriptive.</small>
                    </div>
                    
                    {/* Asset Symbol (for contract) - could be auto-generated and confirmed by user */}
                     <div className="form-group">
                        <label htmlFor="assetSymbolForContract">Contract Asset Symbol (auto-generated, verify/edit):</label>
                        <input
                            type="text" id="assetSymbolForContract" value={assetSymbolForContract}
                            onChange={(e) => setAssetSymbolForContract(e.target.value)}
                            onFocus={() => generateAssetSymbol()} // Generate on focus if empty or user wants to refresh
                            placeholder="e.g., BTCUSD_PRICE_ABOVE_120000_JUL01"
                            required maxLength={64} // Check contract limits
                        />
                         <button type="button" onClick={generateAssetSymbol} style={{marginLeft: '10px'}}>Generate/Update Symbol from Question</button>
                        <small>Keep short, A-Z, 0-9, underscores. Example: `PIUSD_PRICE_ABOVE_0_70_JUN15`</small>
                    </div>


                    {/* Conditional Fields for Price Feed Market */}
                    {marketType === 'priceFeed' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="selectedFeed">Select Price Feed Oracle:</label>
                                <select id="selectedFeed" value={selectedFeed} onChange={(e) => setSelectedFeed(e.target.value)} required>
                                    <option value="">-- Select a Feed --</option>
                                    {SUPPORTED_PRICE_FEEDS.map(feed => (
                                        <option key={feed.address} value={feed.address}>
                                            {feed.name} ({feed.symbol})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="targetPrice">Target Price (e.g., 120000 for $120,000):</label>
                                <input
                                    type="number" id="targetPrice" value={targetPrice}
                                    onChange={(e) => setTargetPrice(e.target.value)}
                                    placeholder="e.g., 120000"
                                    required step="any"
                                />
                            </div>
                        </>
                    )}

                    {/* Conditional Fields for Event Market */}
                    {marketType === 'event' && (
                        <div className="form-group">
                            <label htmlFor="resolutionDetails">Resolution Details & Source of Truth:</label>
                            <textarea
                                id="resolutionDetails" value={resolutionDetails}
                                onChange={(e) => setResolutionDetails(e.target.value)}
                                placeholder="e.g., Outcome based on official results from [website/authority] published on [date]. This market asks 'Will X happen?', so a YES outcome means X happened."
                                rows={3} required
                            />
                            <small>Be very clear. PiOracle admin will use this to resolve the market.</small>
                        </div>
                    )}

                    {/* Expiry Date & Time for Betting */}
                    <div className="form-group form-group-inline">
                        <div>
                            <label htmlFor="expiryDate">Betting Closes Date (UTC):</label>
                            <input type="date" id="expiryDate" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
                        </div>
                        <div>
                            <label htmlFor="expiryTime">Betting Closes Time (UTC):</label>
                            <input type="time" id="expiryTime" value={expiryTime} onChange={(e) => setExpiryTime(e.target.value)} required />
                        </div>
                    </div>
                    
                    {/* Creator Fee */}
                    <div className="form-group">
                        <label htmlFor="creatorFeePercent">Your Prediction Fee (0.00% to 3.00%):</label>
                        <input
                            type="number" id="creatorFeePercent" value={creatorFeePercent}
                            onChange={(e) => setCreatorFeePercent(e.target.value)}
                            min="0" max="3" step="0.01" required
                        />
                        <small>This % of each prediction's stake on this market will go to you.</small>
                    </div>


                    {error && <ErrorMessage message={error} />}
                    {successMessage && <p className="form-message type-success">{successMessage}</p>}

                    <button type="submit" disabled={isLoading || !listingFeeWei || listingFeeWei.isZero()} className="button primary">
                        {isLoading ? <LoadingSpinner size="small" /> : `Create Market & Pay ${listingFeeMATIC} MATIC Fee`}
                    </button>
                </form>
            </div>
        </>
    );
}

export default CreateMarketPage;