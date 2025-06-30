// netlify/functions/get-premium-content.js

const { ethers } = require("ethers");

// --- CONFIGURATION ---
// You MUST set these as Environment Variables in your Netlify Build Settings
const ALCHEMY_POLYGON_URL = process.env.VITE_POLYGON_MAINNET_RPC_URL;
const ALCHEMY_BNB_URL = process.env.VITE_BNB_MAINNET_RPC_URL;

const PAYWALL_POLYGON_ADDRESS = process.env.VITE_POLYGON_PAYWALL_CONTRACT_ADDRESS;
const PAYWALL_BNB_ADDRESS = process.env.VITE_BNB_PAYWALL_CONTRACT_ADDRESS;

// A minimal ABI for the hasAccess function
const PAYWALL_ABI = [
  "function hasAccess(bytes32 contentId, address user) public view returns (bool)"
];

// Your secure content. In a real app, you might load this from a secure database or another service.
const ARTICLE_SLUG = "fictional-invasion-scenario-turkey-israel";
const ARTICLE_CONTENT_ID = ethers.utils.id(ARTICLE_SLUG); // Must match the frontend
const SECRET_ARTICLE_CONTENT = `
# The Barbarossa of the Levant: A Strategic Analysis of Operation Fatih'in Kılıcı

**A PiOracle Exclusive Intelligence Briefing**
... (PASTE YOUR ENTIRE $1M MARKDOWN ARTICLE HERE) ...
`;
// --- END CONFIGURATION ---

exports.handler = async function (event) {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { walletAddress, signature, chainId } = JSON.parse(event.body);

        // 1. Verify the signature to prove wallet ownership
        const message = `I am proving ownership of my address to read article: ${ARTICLE_SLUG}`;
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);

        if (ethers.utils.getAddress(recoveredAddress) !== ethers.utils.getAddress(walletAddress)) {
            throw new Error("Invalid signature. Wallet ownership could not be verified.");
        }
        
        // 2. Check on-chain access based on the chainId provided by the frontend
        let provider;
        let paywallAddress;

        if (Number(chainId) === 137) { // Polygon Mainnet
            provider = new ethers.providers.JsonRpcProvider(ALCHEMY_POLYGON_URL);
            paywallAddress = PAYWALL_POLYGON_ADDRESS;
        } else if (Number(chainId) === 56) { // BNB Mainnet
            provider = new ethers.providers.JsonRpcProvider(ALCHEMY_BNB_URL);
            paywallAddress = PAYWALL_BNB_ADDRESS;
        } else {
            throw new Error(`Unsupported chainId: ${chainId}`);
        }

        if (!paywallAddress) {
            throw new Error(`Paywall contract address not configured for chainId: ${chainId}`);
        }

        const paywallContract = new ethers.Contract(paywallAddress, PAYWALL_ABI, provider);
        const hasPaid = await paywallContract.hasAccess(ARTICLE_CONTENT_ID, walletAddress);

        if (!hasPaid) {
            throw new Error("Access denied. No payment record found on-chain for this wallet and content.");
        }

        // 3. If both checks pass, return the secret content
        return {
            statusCode: 200,
            body: JSON.stringify({ content: SECRET_ARTICLE_CONTENT }),
        };

    } catch (error) {
        console.error("Backend Error:", error);
        return {
            statusCode: 403, // Forbidden
            body: JSON.stringify({ error: error.message }),
        };
    }
};