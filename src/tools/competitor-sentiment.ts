/**
 * Tool 1: analyze_competitor_sentiment
 * Search recent X posts mentioning a competitor, score sentiment using keyword lexicon.
 */

import { XApiClient, XTweet, XUser } from '../lib/x-api.js';
import { scoreSentiment } from '../lib/sentiment.js';
import { buildUserMap, getTopTweets, aggregateEngagement, truncate } from '../lib/utils.js';

export interface CompetitorSentimentParams {
  competitor_name: string;
  days_back?: number; // 1-7 (X recent search limit)
  max_results?: number; // default 100, max 500
}

export interface CompetitorSentimentResult {
  competitor: string;
  query: string;
  analyzed_posts: number;
  sentiment: {
    score: number;
    label: string;
    positive_pct: number;
    negative_pct: number;
    neutral_pct: number;
  };
  engagement: {
    total_likes: number;
    total_retweets: number;
    total_replies: number;
    avg_engagement_per_post: number;
  };
  top_positive_posts: { id: string; text: string; author: string; engagement: number }[];
  top_negative_posts: { id: string; text: string; author: string; engagement: number }[];
}

export async function analyzeCompetitorSentiment(
  client: XApiClient,
  params: CompetitorSentimentParams,
): Promise<CompetitorSentimentResult> {
  const daysBack = Math.min(Math.max(params.days_back ?? 7, 1), 7);
  const maxResults = Math.min(Math.max(params.max_results ?? 100, 10), 500);

  const query = params.competitor_name;
  const startTime = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  const { tweets, users } = await client.searchRecentTweetsAll(query, {
    maxTotal: maxResults,
    startTime,
  });

  const userMap = buildUserMap(users);
  const sentimentResult = scoreSentiment(tweets, userMap);
  const engagement = aggregateEngagement(tweets);

  // Get top positive and negative posts by engagement
  const positiveTweets = tweets.filter((t) => {
    return !t.referenced_tweets?.some((r) => r.type === 'retweeted');
  });

  // Re-score to identify positive/negative tweets
  const positivePosts: { id: string; text: string; author: string; engagement: number }[] = [];
  const negativePosts: { id: string; text: string; author: string; engagement: number }[] = [];

  // Use sample posts from sentiment result, augmented with top tweets
  for (const sample of sentimentResult.sample_positive_posts) {
    positivePosts.push({
      id: sample.id,
      text: truncate(sample.text, 280),
      author: sample.author ?? 'unknown',
      engagement: sample.engagement,
    });
  }
  for (const sample of sentimentResult.sample_negative_posts) {
    negativePosts.push({
      id: sample.id,
      text: truncate(sample.text, 280),
      author: sample.author ?? 'unknown',
      engagement: sample.engagement,
    });
  }

  // Fill remaining slots with top tweets if we don't have enough samples
  if (positivePosts.length < 3 || negativePosts.length < 3) {
    const topTweets = getTopTweets(positiveTweets, 10);
    for (const tt of topTweets) {
      if (positivePosts.length < 3) {
        positivePosts.push({
          id: tt.id,
          text: truncate(tt.text, 280),
          author: tt.author ?? 'unknown',
          engagement: tt.engagement,
        });
      }
    }
  }

  return {
    competitor: params.competitor_name,
    query,
    analyzed_posts: sentimentResult.total_posts,
    sentiment: {
      score: sentimentResult.score,
      label: sentimentResult.label,
      positive_pct: sentimentResult.positive_pct,
      negative_pct: sentimentResult.negative_pct,
      neutral_pct: sentimentResult.neutral_pct,
    },
    engagement: {
      total_likes: engagement.total_likes,
      total_retweets: engagement.total_retweets,
      total_replies: engagement.total_replies,
      avg_engagement_per_post: engagement.avg_engagement_per_post,
    },
    top_positive_posts: positivePosts.slice(0, 5),
    top_negative_posts: negativePosts.slice(0, 5),
  };
}