/**
 * Vercel serverless function: Health check endpoint
 * GET /api/health — returns server status and available tools
 */

export default function handler(_req: unknown, res: {
  status: (code: number) => void;
  setHeader: (name: string, value: string) => void;
  end: (data: string) => void;
}) {
  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    status: 'ok',
    service: 'x-trend-intelligence-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mcp_endpoint: '/api/mcp',
    tools: [
      { name: 'analyze_competitor_sentiment', description: 'Score sentiment of posts mentioning a competitor' },
      { name: 'track_brand_mentions', description: 'Track brand mention volume and engagement over time' },
      { name: 'detect_trending_topics', description: 'Get X trends and identify rising topics' },
      { name: 'compare_share_of_voice', description: 'Compare mention counts and engagement for 2-5 competitors' },
      { name: 'identify_complaints', description: 'Find categorized complaints about a brand' },
      { name: 'monitor_keyword_frequency', description: 'Track keyword appearance frequency over time' },
      { name: 'analyze_influencer_reach', description: 'Analyze an X user profile and their engagement' },
      { name: 'export_intelligence_report', description: 'Generate a combined markdown intelligence report' },
    ],
    auth: 'Provide X API bearer token via Authorization: Bearer <token> or x-api-key header',
  }));
}