/**
 * Tool 7: analyze_influencer_reach
 * Look up a user's profile, get follower count, recent post engagement rates, top performing content.
 */

import { XApiClient, XTweet, XUser } from '../lib/x-api.js';
import { getEngagementScore, getEngagementRate, getTopTweets, truncate, formatDate, aggregateEngagement } from '../lib/utils.js';

export interface InfluencerReachParams {
  username: string; // X/Twitter handle without @
  max_tweets?: number; // default 100
}

export interface InfluencerReachResult {
  profile: {
    id: string;
    name: string;
    username: string;
    verified: boolean;
    followers: number;
    following: number;
    total_tweets: number;
    listed: number;
    account_created: string;
    description: string;
    location: string;
  };
  recent_activity: {
    tweets_analyzed: number;
    avg_engagement_per_post: number;
    avg_engagement_rate: number;
    total_likes: number;
    total_retweets: number;
    total_replies: number;
  };
  top_performing: {
    id: string;
    text: string;
    created_at: string;
    likes: number;
    retweets: number;
    replies: number;
    engagement: number;
    engagement_rate: number;
    url: string;
  }[];
  estimated_reach: {
    follower_count: number;
    avg_impressions_per_post: number;
    estimated_reach_per_post: number;
  };
}

export async function analyzeInfluencerReach(
  client: XApiClient,
  params: InfluencerReachParams,
): Promise<InfluencerReachResult> {
  const username = params.username.replace(/^@/, '');
  const maxTweets = Math.min(Math.max(params.max_tweets ?? 100, 10), 3200);

  // Get user profile
  const userResponse = await client.getUserByUsername(username);
  const user = userResponse.data;

  // Get user tweets (timeline)
  const tweetsResponse = await client.getUserTweets(user.id, {
    maxResults: Math.min(maxTweets, 100),
  });

  const tweets = tweetsResponse.data ?? [];
  const engagement = aggregateEngagement(tweets);

  // Calculate engagement metrics
  const avgEngagementRate = tweets.length > 0
    ? tweets.reduce((sum, t) => sum + getEngagementRate(t), 0) / tweets.length
    : 0;

  // Top performing tweets
  const topTweets = getTopTweets(tweets, 10);
  const topPerforming = topTweets.map((t) => {
    const originalTweet = tweets.find((tw) => tw.id === t.id);
    return {
      id: t.id,
      text: truncate(t.text, 280),
      created_at: formatDate(t.created_at),
      likes: t.likes,
      retweets: t.retweets,
      replies: t.replies,
      engagement: t.engagement,
      engagement_rate: originalTweet ? getEngagementRate(originalTweet) : 0,
      url: `https://x.com/${username}/status/${t.id}`,
    };
  });

  // Estimate reach
  const followerCount = user.public_metrics?.followers_count ?? 0;
  const avgImpressions = tweets.length > 0
    ? tweets.reduce((sum, t) => sum + (t.public_metrics?.impression_count ?? 0), 0) / tweets.length
    : 0;
  const estimatedReachPerPost = Math.round(avgImpressions * 0.9); // ~90% of impressions is a conservative reach estimate

  return {
    profile: {
      id: user.id,
      name: user.name,
      username: user.username,
      verified: user.verified ?? false,
      followers: followerCount,
      following: user.public_metrics?.following_count ?? 0,
      total_tweets: user.public_metrics?.tweet_count ?? 0,
      listed: user.public_metrics?.listed_count ?? 0,
      account_created: formatDate(user.created_at),
      description: user.description ?? '',
      location: user.location ?? '',
    },
    recent_activity: {
      tweets_analyzed: tweets.length,
      avg_engagement_per_post: engagement.avg_engagement_per_post,
      avg_engagement_rate: Math.round(avgEngagementRate * 100) / 100,
      total_likes: engagement.total_likes,
      total_retweets: engagement.total_retweets,
      total_replies: engagement.total_replies,
    },
    top_performing: topPerforming,
    estimated_reach: {
      follower_count: followerCount,
      avg_impressions_per_post: Math.round(avgImpressions),
      estimated_reach_per_post: estimatedReachPerPost,
    },
  };
}