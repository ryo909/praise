import { supabase } from '../supabase';
import type { Recognition, User, Reaction, FeedFilters, EffectKey } from '../types';

export async function fetchRecognitions(
    filters: FeedFilters,
    limit = 20,
    offset = 0
): Promise<Recognition[]> {
    let query = supabase
        .from('recognitions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    // Apply date filter
    const now = new Date();
    if (filters.period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', weekAgo.toISOString());
    } else if (filters.period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', monthAgo.toISOString());
    }

    // Apply person filter
    if (filters.personId) {
        if (filters.personMode === 'from') {
            query = query.eq('from_user_id', filters.personId);
        } else if (filters.personMode === 'to') {
            query = query.eq('to_user_id', filters.personId);
        } else {
            query = query.or(`from_user_id.eq.${filters.personId},to_user_id.eq.${filters.personId}`);
        }
    }

    // Apply text search
    if (filters.query) {
        query = query.ilike('message', `%${filters.query}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching recognitions:', error);
        return [];
    }

    return data || [];
}

export async function fetchRecognitionsWithDetails(
    filters: FeedFilters,
    currentUserId: string,
    limit = 20,
    offset = 0
): Promise<Recognition[]> {
    const recognitions = await fetchRecognitions(filters, limit, offset);

    if (recognitions.length === 0) return [];

    // Get unique user IDs
    const userIds = [...new Set(recognitions.flatMap(r => [r.from_user_id, r.to_user_id]))];
    const recognitionIds = recognitions.map(r => r.id);

    // Fetch users
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);

    // Fetch reactions
    const { data: reactions } = await supabase
        .from('reactions')
        .select('*')
        .in('recognition_id', recognitionIds);

    // Map users by ID
    const userMap = new Map<string, User>();
    users?.forEach(u => userMap.set(u.id, u));

    // Map reactions by recognition ID
    const reactionMap = new Map<string, Reaction[]>();
    reactions?.forEach(r => {
        if (!reactionMap.has(r.recognition_id)) {
            reactionMap.set(r.recognition_id, []);
        }
        reactionMap.get(r.recognition_id)!.push(r);
    });

    // Combine data
    return recognitions.map(r => ({
        ...r,
        from_user: userMap.get(r.from_user_id),
        to_user: userMap.get(r.to_user_id),
        reactions: reactionMap.get(r.id) || [],
        clap_count: (reactionMap.get(r.id) || []).length,
        user_has_clapped: (reactionMap.get(r.id) || []).some(
            reaction => reaction.user_id === currentUserId
        ),
    }));
}

export async function createRecognition(
    fromUserId: string,
    toUserId: string,
    message: string,
    effectKey: EffectKey = 'confetti'
): Promise<Recognition | null> {
    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!fromUserId || !uuidRegex.test(fromUserId)) {
        console.error('Invalid fromUserId:', fromUserId);
        return null;
    }

    if (!toUserId || !uuidRegex.test(toUserId)) {
        console.error('Invalid toUserId:', toUserId);
        return null;
    }

    const payload = {
        from_user_id: fromUserId,
        to_user_id: toUserId,
        message,
        effect_key: effectKey,
    };

    // Debug log in development
    console.log('Creating recognition with payload:', payload);

    const { data, error } = await supabase
        .from('recognitions')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('Error creating recognition:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
        });
        return null;
    }

    console.log('Recognition created successfully:', data);
    return data;
}

export async function fetchRecognitionsForUser(
    userId: string,
    type: 'received' | 'sent',
    limit = 10
): Promise<Recognition[]> {
    const column = type === 'received' ? 'to_user_id' : 'from_user_id';

    const { data, error } = await supabase
        .from('recognitions')
        .select('*')
        .eq(column, userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching user recognitions:', error);
        return [];
    }

    return data || [];
}

export async function fetchRecentRecipients(userId: string): Promise<User[]> {
    const { data, error } = await supabase
        .from('recognitions')
        .select('to_user_id')
        .eq('from_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error || !data) return [];

    // Get unique user IDs (most recent first)
    const uniqueIds = [...new Set(data.map(r => r.to_user_id))].slice(0, 5);

    if (uniqueIds.length === 0) return [];

    const { data: users } = await supabase
        .from('users')
        .select('*')
        .in('id', uniqueIds);

    // Sort by original order
    return uniqueIds
        .map(id => users?.find(u => u.id === id))
        .filter((u): u is User => u !== undefined);
}
