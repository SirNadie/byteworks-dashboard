'use client';

import React, { useEffect, useState } from 'react';

const Dashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<{ users: string; sessions: string; views: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('28d');

    useEffect(() => {
        setLoading(true);
        fetch(`/api/analytics?range=${range}`)
            .then((res) => res.json())
            .then((data) => {
                setMetrics(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching analytics:', err);
                setLoading(false);
            });
    }, [range]);

    const getRangeLabel = (r: string) => {
        switch (r) {
            case '7d': return 'Last 7 Days';
            case '90d': return 'Last 90 Days';
            case 'ytd': return 'Year to Date';
            default: return 'Last 28 Days';
        }
    };

    return (
        <div className="gutter" style={{ paddingBottom: '50px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ margin: '0 0 10px 0' }}>ByteWorks Command Center</h1>
                    <p style={{ margin: 0, color: '#888' }}>Live data from your website ({getRangeLabel(range)}).</p>
                </div>

                <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: '1px solid #333',
                        backgroundColor: '#222',
                        color: 'white',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    <option value="7d">Last 7 Days</option>
                    <option value="28d">Last 28 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="ytd">This Year (YTD)</option>
                </select>
            </div>

            <style>{`
                /* Hide Payload Default Actions for this view only */
                .form-submit, 
                .doc-header__controls,
                .doc-controls,
                .app-header__step-nav,
                .doc-tabs__tabs {
                    display: none !important;
                }
                
                /* Adjust padding since header is gone */
                .gutter {
                    padding-top: 20px !important;
                }
            `}</style>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '24px'
            }}>
                {/* Metric Card: Users */}
                <div style={{
                    backgroundColor: '#222',
                    padding: '24px',
                    borderRadius: '12px',
                    border: '1px solid #333'
                }}>
                    <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#aaa', margin: '0 0 10px 0' }}>
                        Active Users
                    </h3>
                    <div style={{ fontSize: '36px', fontWeight: '800', color: '#fff' }}>
                        {loading ? '...' : metrics?.users || '0'}
                    </div>
                </div>

                {/* Metric Card: Sessions */}
                <div style={{
                    backgroundColor: '#222',
                    padding: '24px',
                    borderRadius: '12px',
                    border: '1px solid #333'
                }}>
                    <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#aaa', margin: '0 0 10px 0' }}>
                        Total Sessions
                    </h3>
                    <div style={{ fontSize: '36px', fontWeight: '800', color: '#00dcb4' }}>
                        {loading ? '...' : metrics?.sessions || '0'}
                    </div>
                </div>

                {/* Metric Card: Views */}
                <div style={{
                    backgroundColor: '#222',
                    padding: '24px',
                    borderRadius: '12px',
                    border: '1px solid #333'
                }}>
                    <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#aaa', margin: '0 0 10px 0' }}>
                        Page Views
                    </h3>
                    <div style={{ fontSize: '36px', fontWeight: '800', color: '#a371f7' }}>
                        {loading ? '...' : metrics?.views || '0'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
