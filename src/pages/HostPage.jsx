import React, { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from './WalletProvider';

// Import all necessary ABIs and config functions
import HOST_REGISTRY_ABI from '../config/abis/HostRegistry.json'; // You'll create this ABI
import TIPPING_JAR_ABI from '../config/abis/TippingJar.json'; 
import IERC20_ABI from '../config/abis/IERC20.json';
import { getConfigForChainId } from '../config/contractConfig';

// Import Components
import LoadingSpinner from '../components/common/LoadingSpinner';

// Main Component
function HostPage() {
    const { walletAddress, signer, chainId } = useContext(WalletContext);
    
    // State for Hosts
    const [hosts, setHosts] = useState([]);
    const [isLoadingHosts, setIsLoadingHosts] = useState(false);
    const [isRegisteredHost, setIsRegisteredHost] = useState(false);

    // State for Registration Form
    const [hostName, setHostName] = useState('');
    const [profileUrl, setProfileUrl] = useState('');

    // State for Tipping Modal
    const [isTipModalOpen, setIsTipModalOpen] = useState(false);
    const [tippingHost, setTippingHost] = useState(null); // { address: '0x...', name: 'CreatorName' }
    const [tipAmount, setTipAmount] = useState('');
    const [tipMessage, setTipMessage] = useState('');

    // General UI State
    const [status, setStatus] = useState({ text: '', type: '' });
    const [isLoading, setIsLoading] = useState(false);

    // Get contract addresses from config based on connected chain
    const currentNetworkConfig = getConfigForChainId(chainId);
    const hostRegistryAddress = currentNetworkConfig?.hostRegistryAddress;
    const tippingJarAddress = currentNetworkConfig?.tippingJarAddress;
    // For this example, we'll hardcode the BSC Testnet USDC address
    const usdcAddress = "0x64544552ce784d068c36575d565a3de625334145";

    const hostRegistryContract = useMemo(() => {
        if (!signer || !hostRegistryAddress) return null;
        return new ethers.Contract(hostRegistryAddress, HOST_REGISTRY_ABI.abi, signer);
    }, [signer, hostRegistryAddress]);

    const tippingJarContract = useMemo(() => {
        if (!signer || !tippingJarAddress) return null;
        return new ethers.Contract(tippingJarAddress, TIPPING_JAR_ABI.abi, signer);
    }, [signer, tippingJarAddress]);

    // Fetch hosts and check user's registration status
    useEffect(() => {
        const loadPageData = async () => {
            if (!hostRegistryContract || !walletAddress) return;
            setIsLoadingHosts(true);
            try {
                // Check if current user is registered
                const myHostData = await hostRegistryContract.hosts(walletAddress);
                setIsRegisteredHost(myHostData.isRegistered);

                // Fetch a list of hosts
                const hostCount = await hostRegistryContract.getHostCount();
                const hostAddresses = await hostRegistryContract.getHosts(0, 20); // Get first 20 hosts
                const hostDataPromises = hostAddresses.map(addr => hostRegistryContract.hosts(addr));
                const hostDetails = await Promise.all(hostDataPromises);
                
                const combinedHostData = hostAddresses.map((addr, index) => ({
                    address: addr,
                    name: hostDetails[index].name,
                    profileUrl: hostDetails[index].profileUrl
                }));
                setHosts(combinedHostData);

            } catch (error) {
                console.error("Error loading host data:", error);
            } finally {
                setIsLoadingHosts(false);
            }
        };
        loadPageData();
    }, [hostRegistryContract, walletAddress]);


    const handleRegisterHost = async (e) => {
        e.preventDefault();
        if (!hostRegistryContract) return;
        setIsLoading(true); setStatus({text: 'Registering...', type:'info'});
        try {
            const tx = await hostRegistryContract.registerAsHost(hostName, profileUrl);
            await tx.wait(1);
            setStatus({text: 'Successfully registered as a Host!', type:'success'});
            setIsRegisteredHost(true); // Update UI state
        } catch (err) {
            setStatus({text: `Error: ${err.reason || err.message}`, type: 'error'});
        } finally {
            setIsLoading(false);
        }
    };

    const handleTip = async () => {
        if (!tippingJarContract || !tipAmount || !tippingHost) return;
        setIsLoading(true); setStatus({text: 'Processing tip...', type:'info'});
        try {
            const erc20Token = new ethers.Contract(usdcAddress, IERC20_ABI, signer);
            const amountInWei = ethers.utils.parseUnits(tipAmount, 6);

            // 1. Approve
            const allowance = await erc20Token.allowance(walletAddress, tippingJarAddress);
            if (allowance.lt(amountInWei)) {
                setStatus({text: 'Approving token spend...', type:'info'});
                const approveTx = await erc20Token.approve(tippingJarAddress, ethers.constants.MaxUint256);
                await approveTx.wait(1);
                setStatus({text: 'Approved! Now sending tip...', type:'info'});
            }

            // 2. Tip
            const tipTx = await tippingJarContract.tip(tippingHost.address, usdcAddress, amountInWei, tipMessage);
            await tipTx.wait(1);
            setStatus({text: `Successfully tipped ${tippingHost.name}!`, type: 'success'});
            setIsTipModalOpen(false); // Close modal on success
            setTipAmount(''); setTipMessage('');
        } catch (err) {
             setStatus({text: `Error: ${err.reason || err.message}`, type: 'error'});
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="page-container host-page">
            <section className="hero-section">
                <h1>Become a PiOracle Host</h1>
                <p>Join our ecosystem, receive tips in stablecoins, and get exclusive airdrops of our upcoming Pi Network Brotherhood Token (PIBT)!</p>
                 <a href="https://pinetworkbrotherhood.online" target="_blank" rel="noopener noreferrer" className="pibt-link">Learn More About PIBT</a>
            </section>

            {walletAddress && !isRegisteredHost && (
                <section className="registration-form-section form-card">
                    <h2>Register as a Host to Receive Tips & Airdrops</h2>
                    <form onSubmit={handleRegisterHost}>
                        <input value={hostName} onChange={e => setHostName(e.target.value)} placeholder="Your Name or Brand" required />
                        <input value={profileUrl} onChange={e => setProfileUrl(e.target.value)} placeholder="Link to your YouTube, X, or main profile" required />
                        <button type="submit" disabled={isLoading}>{isLoading ? 'Registering...' : 'Register Now!'}</button>
                    </form>
                </section>
            )}
             {walletAddress && isRegisteredHost && (
                <div className="status-box success">You are registered as a Host! Your address is now eligible for tips and PIBT airdrops.</div>
            )}


            <section className="host-list-section">
                <h2>Support Our Hosts</h2>
                {isLoadingHosts ? <LoadingSpinner /> : (
                    <div className="host-grid">
                        {hosts.map(host => (
                            <div key={host.address} className="host-card">
                                <h3>{host.name}</h3>
                                <a href={host.profileUrl} target="_blank" rel="noopener noreferrer">View Profile</a>
                                <button onClick={() => { setTippingHost(host); setIsTipModalOpen(true); }}>Tip Host</button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
            
            {/* Tipping Modal */}
            {isTipModalOpen && tippingHost && (
                <div className="modal-backdrop" onClick={() => setIsTipModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Tip {tippingHost.name}</h2>
                        <input type="number" value={tipAmount} onChange={e => setTipAmount(e.target.value)} placeholder="Amount in USDC" />
                        <input type="text" value={tipMessage} onChange={e => setTipMessage(e.target.value)} placeholder="Optional message" />
                        <button onClick={handleTip} disabled={isLoading}>{isLoading ? 'Processing...' : 'Send Tip'}</button>
                        <button onClick={() => setIsTipModalOpen(false)} className="close-button">Cancel</button>
                        {status.text && <p className={`message ${status.type}`}>{status.text}</p>}
                    </div>
                </div>
            )}

        </div>
    );
}

export default HostPage;