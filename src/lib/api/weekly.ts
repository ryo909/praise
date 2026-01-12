import { supabase } from '../supabase';
import type { WeeklyDigest, WeeklyStats } from '../types';

export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

export async function fetchWeeklyDigests(limit = 10): Promise<WeeklyDigest[]> {
    const { data, error } = await supabase
        .from('weekly_digests')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching weekly digests:', error);
        return [];
    }

    return data || [];
}

export async function fetchWeeklyDigest(weekStart: string): Promise<WeeklyDigest | null> {
    const { data, error } = await supabase
        .from('weekly_digests')
        .select('*')
        .eq('week_start', weekStart)
        .single();

    if (error) {
        console.error('Error fetching weekly digest:', error);
        return null;
    }

    return data;
}

export async function generateWeeklyDigest(
    weekStart: Date,
    weekEnd: Date
): Promise<WeeklyDigest | null> {
    // Fetch recognitions for the week
    const { data: recognitions, error: recError } = await supabase
        .from('recognitions')
        .select('*')
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

    if (recError) {
        console.error('Error fetching recognitions for digest:', recError);
        return null;
    }

    // Calculate stats
    const receiverCounts = new Map<string, number>();
    const giverCounts = new Map<string, number>();

    recognitions?.forEach(r => {
        receiverCounts.set(r.to_user_id, (receiverCounts.get(r.to_user_id) || 0) + 1);
        giverCounts.set(r.from_user_id, (giverCounts.get(r.from_user_id) || 0) + 1);
    });

    // Get user names
    const allUserIds = [...new Set([...receiverCounts.keys(), ...giverCounts.keys()])];
    const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', allUserIds);

    const userNameMap = new Map(users?.map(u => [u.id, u.name]) || []);

    // Sort and get top 3
    const topReceivers = [...receiverCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([user_id, count]) => ({
            user_id,
            user_name: userNameMap.get(user_id) || 'Unknown',
            count,
        }));

    const topGivers = [...giverCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([user_id, count]) => ({
            user_id,
            user_name: userNameMap.get(user_id) || 'Unknown',
            count,
        }));

    // Pick featured recognitions (first 3)
    const featuredRecognitions = (recognitions || []).slice(0, 3).map(r => r.id);

    const stats: WeeklyStats = {
        total_recognitions: recognitions?.length || 0,
        top_receivers: topReceivers,
        top_givers: topGivers,
        featured_recognitions: featuredRecognitions,
    };

    // Upsert digest
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('weekly_digests')
        .upsert({
            week_start: weekStartStr,
            week_end: weekEndStr,
            stats_json: stats,
        }, {
            onConflict: 'week_start,week_end',
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating weekly digest:', error);
        return null;
    }

    return data;
}
