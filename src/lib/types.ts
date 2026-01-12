// Type definitions for Peer Praise application

export interface User {
    id: string;
    name: string;
    dept?: string;
    created_at: string;
}

export type EffectKey = 'confetti' | 'sparkle' | 'clap' | 'firework' | 'stamp' | 'none';

export interface Recognition {
    id: string;
    from_user_id: string;
    to_user_id: string;
    message: string;
    effect_key: EffectKey;
    created_at: string;
    // Joined data
    from_user?: User;
    to_user?: User;
    reactions?: Reaction[];
    clap_count?: number;
    user_has_clapped?: boolean;
}

export interface Reaction {
    id: string;
    recognition_id: string;
    user_id: string;
    type: 'clap';
    created_at: string;
}

export interface WeeklyDigest {
    id: string;
    week_start: string;
    week_end: string;
    stats_json: WeeklyStats;
    created_at: string;
}

export interface WeeklyStats {
    total_recognitions: number;
    top_receivers: { user_id: string; user_name: string; count: number }[];
    top_givers: { user_id: string; user_name: string; count: number }[];
    featured_recognitions: string[];
}

export interface Badge {
    id: string;
    key: string;
    label: string;
    emoji: string;
    created_at: string;
}

export interface UserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    week_start: string;
    created_at: string;
    // Joined data
    badge?: Badge;
    user?: User;
}

export interface FeedFilters {
    period: 'week' | 'month' | 'all';
    personMode: 'any' | 'from' | 'to';
    personId?: string;
    query?: string;
}
