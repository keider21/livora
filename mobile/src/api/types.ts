export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  gender: string;
  level: number;
  xp: number;
  isHost: boolean;
  createdAt: string;
}

export interface CurrentUser extends PublicUser {
  email: string;
  coins: number;
  diamonds: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
  followers?: number;
  following?: number;
}

export interface Room {
  id: string;
  title: string;
  coverUrl: string | null;
  category: string;
  status: 'live' | 'ended';
  channel: string;
  viewerCount: number;
  peakViewers: number;
  totalDiamonds: number;
  totalLikes: number;
  startedAt: string;
  endedAt: string | null;
  host: PublicUser;
}

export interface StreamCredentials {
  provider: string;
  channel: string;
  identity: string;
  role: 'host' | 'viewer';
  token: string;
  url?: string;
  expiresAt: number;
}

export interface Gift {
  id: string;
  code: string;
  name: string;
  emoji: string;
  priceCoins: number;
  tier: string;
  animation: string;
  isActive: boolean;
}

export interface Wallet {
  coins: number;
  diamonds: number;
}

export interface CoinPackage {
  id: string;
  coins: number;
  priceUsd: number;
  bonus: number;
}

export interface RankingEntry {
  rank: number;
  score: number;
  user: PublicUser;
}

export interface Transaction {
  id: string;
  type: string;
  currency: string;
  amount: number;
  balanceAfter: number;
  reference: string | null;
  createdAt: string;
}

export interface PastStream {
  id: string;
  title: string;
  category: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  peakViewers: number;
  totalDiamonds: number;
  totalLikes: number;
}

export interface Profile {
  user: PublicUser;
  stats: { followers: number; following: number };
  isFollowing: boolean;
  isSelf: boolean;
  liveRoom: { id: string; title: string; viewerCount: number } | null;
}
