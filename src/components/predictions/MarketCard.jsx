// Temporary MarketCard.jsx for debugging
function MarketCard({ market }) {
    if (!market) return null;
    console.log("Rendering MarketCard for ID:", market.id, market.title);
    return (
        <div style={{ border: '1px solid red', margin: '10px', padding: '10px' }}>
            <p>ID: {market.id}</p>
            <p>Title: {market.title}</p>
            <p>Status: {market.statusString}</p>
        </div>
    );
}
export default MarketCard;
