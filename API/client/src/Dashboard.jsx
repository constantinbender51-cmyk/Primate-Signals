// Replace your getSignalText with this:
const getSignalText = (val) => {
    const style = {
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        display: 'inline-block',
        minWidth: '50px',
        textAlign: 'center'
    };

    if (val === 1) return <span style={{ ...style, background: '#dcfce7', color: '#166534' }}>BUY</span>;
    if (val === -1) return <span style={{ ...style, background: '#fee2e2', color: '#991b1b' }}>SELL</span>;
    return <span style={{ ...style, background: '#f3f4f6', color: '#374151' }}>WAIT</span>;
};

// Inside the return, replace the Restricted View div with this:
<div style={{ 
    background: '#fff', 
    border: '1px solid #e5e7eb', 
    borderRadius: '12px', 
    padding: '2rem', 
    textAlign: 'center',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
}}>
    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
    <h3 style={{ margin: 0, border: 'none' }}>Premium Access Required</h3>
    <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Join 500+ traders getting real-time probabilistic signals.
    </p>
    <button onClick={handleSubscribe} style={{ padding: '12px 24px', fontSize: '16px' }}>
        Start Free Trial — 49.90€/mo
    </button>
</div>
