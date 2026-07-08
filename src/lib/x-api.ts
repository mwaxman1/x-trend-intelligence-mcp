/**
 * X API v2 client wrapper.
 * Proxies requests to X/Twitter API v2 using the user's bearer token.
 */

export interface XTweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
    bookmark_count?: number;
  };
  entities?: {
    hashtags?: { tag: string; start: number; end: number }[];
    mentions?: { username: string; start: number; end: number; id: string }[];
    urls?: { url: string; expanded_url: string; start: number; end: number }[];
  };
  lang?: string;
  referenced_tweets?: { type: 'retweeted' | 'quoted' | 'replied_to'; id: string }[];
}

export interface XUser {
  id: string;
  name: string;
  username: string;
  created_at?: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  verified?: boolean;
  profile_image_url?: string;
  location?: string;
  url?: string;
}

export interface XTrend {
  name: string;
  query?: string;
  tweet_volume?: number;
}

export interface XSearchResponse {
  data?: XTweet[];
  meta?: {
    next_token?: string;
    result_count: number;
    newest_id?: string;
    oldest_id?: string;
  };
  includes?: {
    users?: XUser[];
    tweets?: XTweet[];
  };
}

export interface XUserResponse {
  data: XUser;
}

export interface XTrendsResponse {
  data?: { trends: XTrend[]; location: string }[];
}

interface XquikSearchTweet {
  id: string;
  text: string;
  createdAt?: string;
  author?: {
    id?: string;
    name?: string;
    username?: string;
    verified?: boolean;
  };
  bookmarkCount?: number;
  likeCount?: number;
  quoteCount?: number;
  replyCount?: number;
  retweetCount?: number;
  viewCount?: number;
}

interface XquikSearchResponse {
  tweets?: XquikSearchTweet[];
  has_next_page?: boolean;
  next_cursor?: string;
}

export class XApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'XApiError';
    this.status = status;
    this.body = body;
  }
}

export class XApiClient {
  private bearerToken: string;
  private baseUrl = 'https://api.x.com/2';

  constructor(bearerToken: string) {
    if (!bearerToken) {
      throw new XApiError('X API bearer token is required', 401);
    }
    this.bearerToken = bearerToken;
  }

  private async request<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      throw new XApiError(
        `Network error contacting X API: ${err instanceof Error ? err.message : 'unknown'}`,
        503,
      );
    }

    const bodyText = await response.text();
    let body: unknown;
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      body = bodyText;
    }

    if (!response.ok) {
      const errorMsg =
        (body as { title?: string; detail?: string; error?: string })?.title ||
        (body as { error?: string })?.error ||
        `X API returned status ${response.status}`;
      throw new XApiError(errorMsg, response.status, body);
    }

    return body as T;
  }

  /**
   * Search recent tweets (last 7 days).
   */
  async searchRecentTweets(
    query: string,
    opts?: {
      maxResults?: number;
      nextToken?: string;
      startTime?: string;
      endTime?: string;
      tweetFields?: string;
      expansions?: string;
    },
  ): Promise<XSearchResponse> {
    const params: Record<string, string | number | undefined> = {
      query,
      max_results: opts?.maxResults ?? 100,
      'tweet.fields': opts?.tweetFields ?? 'created_at,public_metrics,entities,lang,author_id,referenced_tweets',
      expansions: opts?.expansions ?? 'author_id',
      'user.fields': 'name,username,public_metrics,verified,profile_image_url',
    };
    if (opts?.nextToken) params.next_token = opts.nextToken;
    if (opts?.startTime) params.start_time = opts.startTime;
    if (opts?.endTime) params.end_time = opts.endTime;
    return this.request<XSearchResponse>('/tweets/search/recent', params);
  }

  /**
   * Get user by username.
   */
  async getUserByUsername(username: string): Promise<XUserResponse> {
    return this.request<XUserResponse>(`/users/by/username/${username}`, {
      'user.fields': 'created_at,description,public_metrics,verified,profile_image_url,location,url',
    });
  }

  /**
   * Get user tweets (timeline).
   */
  async getUserTweets(
    userId: string,
    opts?: {
      maxResults?: number;
      nextToken?: string;
      startTime?: string;
      endTime?: string;
    },
  ): Promise<XSearchResponse> {
    const params: Record<string, string | number | undefined> = {
      max_results: opts?.maxResults ?? 100,
      'tweet.fields': 'created_at,public_metrics,entities,lang,referenced_tweets',
      exclude: 'retweets,replies',
    };
    if (opts?.nextToken) params.next_token = opts.nextToken;
    if (opts?.startTime) params.start_time = opts.startTime;
    if (opts?.endTime) params.end_time = opts.endTime;
    return this.request<XSearchResponse>(`/users/${userId}/tweets`, params);
  }

  /**
   * Get a single tweet by ID.
   */
  async getTweet(tweetId: string): Promise<{ data: XTweet }> {
    return this.request<{ data: XTweet }>(`/tweets/${tweetId}`, {
      'tweet.fields': 'created_at,public_metrics,entities,lang,author_id,referenced_tweets',
      expansions: 'author_id',
      'user.fields': 'name,username,public_metrics,verified',
    });
  }

  /**
   * Get trends for a location (if available).
   * Note: This endpoint has limited availability in X API v2.
   */
  async getTrends(locationId?: string): Promise<XTrendsResponse> {
    const params: Record<string, string | number | undefined> = {};
    if (locationId) params.id = locationId;
    return this.request<XTrendsResponse>('/trends', params);
  }

  /**
   * Search recent tweets and paginate to collect more results.
   */
  async searchRecentTweetsAll(
    query: string,
    opts?: {
      maxResults?: number;
      maxTotal?: number;
      startTime?: string;
      endTime?: string;
    },
  ): Promise<{ tweets: XTweet[]; users: XUser[] }> {
    const maxTotal = opts?.maxTotal ?? 200;
    const allTweets: XTweet[] = [];
    const userMap = new Map<string, XUser>();
    let nextToken: string | undefined;

    do {
      const response = await this.searchRecentTweets(query, {
        maxResults: opts?.maxResults ?? 100,
        nextToken,
        startTime: opts?.startTime,
        endTime: opts?.endTime,
      });

      if (response.data) {
        allTweets.push(...response.data);
      }
      if (response.includes?.users) {
        for (const user of response.includes.users) {
          userMap.set(user.id, user);
        }
      }

      nextToken = response.meta?.next_token;
    } while (nextToken && allTweets.length < maxTotal);

    return { tweets: allTweets.slice(0, maxTotal), users: Array.from(userMap.values()) };
  }
}

export class XquikApiClient extends XApiClient {
  private apiKey: string;
  private apiBaseUrl: string;

  constructor(apiKey: string, apiBaseUrl = 'https://xquik.com/api/v1') {
    super(apiKey);
    if (!apiKey) {
      throw new XApiError('Xquik API key is required', 401);
    }
    this.apiKey = apiKey;
    this.apiBaseUrl = normalizeXquikBaseUrl(apiBaseUrl);
  }

  override async searchRecentTweets(
    query: string,
    opts?: {
      maxResults?: number;
      nextToken?: string;
      startTime?: string;
      endTime?: string;
      tweetFields?: string;
      expansions?: string;
    },
  ): Promise<XSearchResponse> {
    const url = new URL(`${this.apiBaseUrl}/x/tweets/search`);
    url.searchParams.set('q', query);
    if (opts?.nextToken) {
      url.searchParams.set('cursor', opts.nextToken);
    }

    const response = await this.requestXquik<XquikSearchResponse>(url);
    const tweets = response.tweets ?? [];
    const users = new Map<string, XUser>();

    const data = tweets.map((tweet): XTweet => {
      const author = normalizeXquikAuthor(tweet.author);
      if (author) {
        users.set(author.id, author);
      }

      return {
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.createdAt,
        author_id: author?.id,
        public_metrics: {
          retweet_count: tweet.retweetCount ?? 0,
          reply_count: tweet.replyCount ?? 0,
          like_count: tweet.likeCount ?? 0,
          quote_count: tweet.quoteCount ?? 0,
          impression_count: tweet.viewCount,
          bookmark_count: tweet.bookmarkCount,
        },
      };
    });

    return {
      data,
      meta: {
        next_token: response.has_next_page ? response.next_cursor : undefined,
        result_count: data.length,
      },
      includes: {
        users: Array.from(users.values()),
      },
    };
  }

  override async getUserByUsername(): Promise<XUserResponse> {
    throw new XApiError('Xquik source mode currently supports search-based intelligence tools only.', 501);
  }

  override async getUserTweets(): Promise<XSearchResponse> {
    throw new XApiError('Xquik source mode currently supports search-based intelligence tools only.', 501);
  }

  override async getTweet(): Promise<{ data: XTweet }> {
    throw new XApiError('Xquik source mode currently supports search-based intelligence tools only.', 501);
  }

  override async getTrends(): Promise<XTrendsResponse> {
    throw new XApiError('Xquik source mode currently supports search-based intelligence tools only.', 501);
  }

  private async requestXquik<T>(url: URL): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          Accept: 'application/json',
        },
      });
    } catch (err) {
      throw new XApiError(
        `Network error contacting Xquik API: ${err instanceof Error ? err.message : 'unknown'}`,
        503,
      );
    }

    const bodyText = await response.text();
    let body: unknown;
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      body = bodyText;
    }

    if (!response.ok) {
      const errorMsg =
        (body as { message?: string; error?: string })?.message ||
        (body as { error?: string })?.error ||
        `Xquik API returned status ${response.status}`;
      throw new XApiError(errorMsg, response.status, body);
    }

    return body as T;
  }
}

function normalizeXquikBaseUrl(apiBaseUrl: string): string {
  const url = new URL(apiBaseUrl);
  if (url.protocol !== 'https:') {
    throw new XApiError('Xquik API base URL must use HTTPS.', 400);
  }
  return url.toString().replace(/\/$/, '');
}

function normalizeXquikAuthor(author: XquikSearchTweet['author']): XUser | undefined {
  if (!author?.username) {
    return undefined;
  }

  return {
    id: author.id ?? author.username,
    name: author.name ?? author.username,
    username: author.username,
    verified: author.verified,
  };
}
