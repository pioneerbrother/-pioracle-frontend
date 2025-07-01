// netlify/functions/get-premium-content.js

const { ethers } = require("ethers");
const fs = require('fs/promises');
const path = require('path');

// --- Configuration ---
const PAYWALL_BSC_TESTNET_ADDRESS = process.env.BSC_TESTNET_PREMIUM_CONTENT_ADDRESS;
const BSC_TESTNET_RPC_URL = process.env.BSC_TESTNET_RPC_URL;

const PAYWALL_ABI = ["function hasAccess(bytes32 contentId, address user) view returns (bool)"];
const provider = new ethers.providers.JsonRpcProvider(BSC_TESTNET_RPC_URL);
const premiumContentContract = new ethers.Contract(PAYWALL_BSC_TESTNET_ADDRESS, PAYWALL_ABI, provider);
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
        
        if (Number(chainId) !== 97) {
            return { statusCode: 400, body: 'Unsupported network.' };
        }

        const message = `I am proving ownership of my address to read article: ${slug}`;
        // --- FIX FOR SIGNATURE VERIFICATION ---
        // Use the ethers v5 syntax for verifyMessage as well for consistency
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return { statusCode: 401, body: 'Unauthorized: Invalid signature.' };
        }
        
        // --- THIS IS THE FINAL FIX ---
        // We change to the ethers v5 syntax for id as well.
        const contentId = ethers.utils.id(slug);
        // --- END OF FIX ---

        const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);

        if (!hasPaid) {
            return { statusCode: 403, body: 'Forbidden: On-chain access denied.' };
        }

        const contentFilePath = path.resolve(__dirname, '..', '..', '_secure_content', `${slug}.md`);
        const markdownContent = await fs.readFile(contentFilePath, 'utf-8');

        return {
            statusCode: 200,
            body: JSON.stringify({ content: markdownContent }),
        };

    } catch (error) {
        console.error("Backend Error:", error);
        if (error.code === 'ENOENT') {
            return { statusCode: 404, body: `Content for slug '${slug}' not found.` };
        }
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};