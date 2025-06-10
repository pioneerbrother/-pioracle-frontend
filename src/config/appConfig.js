
// src/config/appConfig.js
export const SUPPORTED_PRICE_FEEDS = [ // Make sure 'export' and 'const' are there
    { name: "Bitcoin (BTC/USD)", symbolPrefix: "BTCUSD", address: "0xc907E116054Ad103354f2D350FD2514433D57F6f", decimals: 8 },
    { name: "Ethereum (ETH/USD)", symbolPrefix: "ETHUSD", address: "0xF9680D99D6C9589e2a93a78A04A279e509205945", decimals: 8 },
    { name: "MATIC (MATIC/USD)", symbolPrefix: "MATICUSD", address: "0xAB594600376Ec9fD91F8e885dADF0CE0228dda62", decimals: 8 },
    // ... other feeds
];