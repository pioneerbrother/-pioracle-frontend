// netlify/functions/get-premium-content.js

const { ethers } = require("ethers");
const fs = require('fs/promises');
const path = require('path');

// --- Configuration (from environment variables set in Netlify) ---
// We now support Testnet in the backend
const BSC_TESTNET_RPC_URL = process.env.VITE_BSC_TESTNET_RPC_URL;
const PAYWALL_BSC_TESTNET_ADDRESS = process.env.VITE_BSC_TESTNET_PREMIUM_CONTENT_ADDRESS;

// Mainnet URLs (for when you go live)
const ALCHEMY_POLYGON_URL = process.env.VITE_POLYGON_MAINNET_RPC_URL;
const ALCHEMY_BNB_URL = process.env.VITE_BNB_MAINNET_RPC_URL;
const PAYWALL_POLYGON_ADDRESS = process.env.VITE_POLYGON_PAYWALL_CONTRACT_ADDRESS;
const PAYWALL_BNB_ADDRESS = process.env.VITE_BNB_PAYWALL_CONTRACT_ADDRESS;

// A minimal ABI for the function we need to call
const PAYWALL_ABI = ["function hasAccess(bytes32 contentId, address user) view returns (bool)"];
// --- End Configuration ---


exports.handler = async function (event) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { slug, walletAddress, signature, chainId } = JSON.parse(event.body);

        if (!slug || !walletAddress || !signature || !chainId) {
            return { statusCode: 400, body: 'Missing required parameters.' };
        }

        // --- DYNAMIC PART 1: The message now uses the slug sent from the frontend ---
        const message = `I am proving ownership of my address to read article: ${slug}`;
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return { statusCode: 401, body: 'Unauthorized: Invalid signature.' };
        }
        
        // --- DYNAMIC PART 2: Select provider and contract based on chainId ---
        let provider;
        let paywallAddress;
        const numChainId = Number(chainId);

        if (numChainId === 97) { // BNB Testnet
            provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC_URL);
            paywallAddress = PAYWALL_BSC_TESTNET_ADDRESS;
        } else if (numChainId === 56) { // BNB Mainnet
            provider = new ethers.JsonRpcProvider(ALCHEMY_BNB_URL);
            paywallAddress = PAYWALL_BNB_ADDRESS;
        } else if (numChainId === 137) { // Polygon Mainnet
            provider = new ethers.JsonRpcProvider(ALCHEMY_POLYGON_URL);
            paywallAddress = PAYWALL_POLYGON_ADDRESS;
        } else {
            return { statusCode: 400, body: `Unsupported chainId: ${numChainId}` };
        }

        if (!paywallAddress || !provider) {
            return { statusCode: 500, body: `Paywall not configured for chainId: ${numChainId}`};
        }

        const paywallContract = new ethers.Contract(paywallAddress, PAYWALL_ABI, provider);
        const contentId = ethers.id(slug); // Generate the contentId dynamically from the slug
        const hasPaid = await paywallContract.hasAccess(contentId, walletAddress);

        if (!hasPaid) {
            return { statusCode: 403, body: 'Forbidden: On-chain access denied.' };
        }

        // --- DYNAMIC PART 3: Read the correct file from your secure folder ---
        // This makes your backend infinitely scalable to new articles.
        const contentFilePath = path.resolve(__dirname, '..', '..', '_secure_content', `${slug}.md`);
        const markdownContent = await fs.readFile(contentFilePath, 'utf-8');

        return {
            statusCode: 200,
            body: JSON.stringify({ content: markdownContent }),
        };

    } catch (error) {
        console.error("Backend Error:", error);
        if (error.code === 'ENOENT') {
            return { statusCode: 404, body: 'Content not found.' };
        }
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};