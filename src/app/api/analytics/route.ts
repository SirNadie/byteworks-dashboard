import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextResponse } from 'next/server';

// Fix private key formatting (Next.js env vars might escape newlines)
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
    },
});

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '28d';

        const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

        if (!propertyId || !process.env.GOOGLE_CLIENT_EMAIL || !privateKey) {
            console.error('Missing Google Analytics credentials in .env');
            return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
        }

        let startDate = '28daysAgo';
        switch (range) {
            case '7d': startDate = '7daysAgo'; break;
            case '90d': startDate = '90daysAgo'; break;
            case 'ytd': startDate = `${new Date().getFullYear()}-01-01`; break;
            default: startDate = '28daysAgo';
        }

        // Run report
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [
                {
                    startDate: startDate,
                    endDate: 'today',
                },
            ],
            metrics: [
                { name: 'activeUsers' },
                { name: 'sessions' },
                { name: 'screenPageViews' },
            ],
        });

        // Extract metric values safely
        const row = response.rows?.[0];
        const data = {
            users: row?.metricValues?.[0]?.value || '0',
            sessions: row?.metricValues?.[1]?.value || '0',
            views: row?.metricValues?.[2]?.value || '0',
        };

        return NextResponse.json(data);

    } catch (error) {
        console.error('Google Analytics API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics data', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
