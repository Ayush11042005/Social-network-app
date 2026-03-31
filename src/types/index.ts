export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  password?: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  website?: string;
  location?: string;
  dob?: string;
  privacy: 'public' | 'private' | 'friends-only';
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
  isBlocked?: boolean;
  isFollowedBy?: boolean;
  online?: boolean;
}

export interface Post {
  id: string;
  content: string;
  images: string[];
  video?: string;
  location?: string;
  visibility: 'public' | 'followers' | 'private';
  createdAt: string;
  updatedAt: string;
  author: User;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  myReaction?: ReactionType;
  reactions: Record<ReactionType, number>;
  hashtags: string[];
  mentions: string[];
  sharedPost?: Post;
  shareCaption?: string;
  groupId?: string;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'sad' | 'angry';

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: User;
  postId: string;
  parentId?: string;
  likesCount: number;
  isLiked: boolean;
  replies?: Comment[];
  replyCount: number;
  depth: number;
}

export interface Story {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: string;
  expiresAt: string;
  author: User;
  viewerCount: number;
  isViewed: boolean;
  reactions: { emoji: string; userId: string }[];
  isHighlighted: boolean;
}

export interface StoryGroup {
  user: User;
  stories: Story[];
  hasUnviewed: boolean;
}

export interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'emoji';
  mediaUrl?: string;
  createdAt: string;
  sender: User;
  conversationId: string;
  status: 'sent' | 'delivered' | 'seen';
  replyTo?: Message;
  reaction?: string;
  deletedForMe: boolean;
  deletedForEveryone: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  isRequest: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
  actor: User;
  targetId?: string;
  targetType?: 'post' | 'comment' | 'story' | 'group' | 'user';
}

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'mention'
  | 'reaction'
  | 'group_invite'
  | 'story_view'
  | 'share'
  | 'message';

export interface Group {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  privacy: 'public' | 'private';
  createdAt: string;
  creator: User;
  memberCount: number;
  myRole?: 'admin' | 'moderator' | 'member';
  isMember: boolean;
}

export interface Hashtag {
  name: string;
  postCount: number;
}

export interface SearchResult {
  users: User[];
  posts: Post[];
  hashtags: Hashtag[];
  groups: Group[];
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
