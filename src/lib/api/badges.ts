import { supabase } from '../supabase';
import type { Badge, UserBadge } from '../types';

export async function fetchBadges(): Promise<Badge[]> {
    const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('key');

    if (error) {
        console.error('Error fetching badges:', error);
        return [];
    }

    return data || [];
}

export async function fetchUserBadges(
    userId: string,
    weekStart?: string
): Promise<UserBadge[]> {
    let query = supabase
        .from('user_badges')
        .select(`
      *,
      badge:badges(*)
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (weekStart) {
        query = query.eq('week_start', weekStart);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching user badges:', error);
        return [];
    }

    return data || [];
}

export async function fetchWeekBadges(weekStart: string): Promise<UserBadge[]> {
    const { data, error } = await supabase
        .from('user_badges')
        .select(`
      *,
      badge:badges(*),
      user:users(*)
    `)
        .eq('week_start', weekStart);

    if (error) {
        console.error('Error fetching week badges:', error);
        return [];
    }

    return data || [];
}

export async function assignBadge(
    userId: string,
    badgeId: string,
    weekStart: string
): Promise<UserBadge | null> {
    const { data, error } = await supabase
        .from('user_badges')
        .insert({
            user_id: userId,
            badge_id: badgeId,
            week_start: weekStart,
        })
        .select()
        .single();

    if (error) {
        console.error('Error assigning badge:', error);
        return null;
    }

    return data;
}

export async function removeBadge(userBadgeId: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_badges')
        .delete()
        .eq('id', userBadgeId);

    if (error) {
        console.error('Error removing badge:', error);
        return false;
    }

    return true;
}
