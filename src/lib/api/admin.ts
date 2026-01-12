import { supabase } from '../supabase';

/**
 * Delete all history data (recognitions, reactions, weekly_digests)
 * @param includeBadges - If true, also delete user_badges
 * @returns Object with success status and counts of deleted items
 */
export async function deleteAllHistory(includeBadges: boolean = false): Promise<{
    success: boolean;
    deleted: {
        reactions: number;
        recognitions: number;
        weeklyDigests: number;
        userBadges?: number;
    };
    error?: string;
}> {
    try {
        // Delete in order to respect foreign key constraints
        // 1. Delete reactions first (references recognitions)
        const { error: reactionsError } = await supabase
            .from('reactions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (reactionsError) {
            console.error('Error deleting reactions:', reactionsError);
            return { success: false, deleted: { reactions: 0, recognitions: 0, weeklyDigests: 0 }, error: reactionsError.message };
        }

        // 2. Delete recognitions
        const { error: recognitionsError } = await supabase
            .from('recognitions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (recognitionsError) {
            console.error('Error deleting recognitions:', recognitionsError);
            return { success: false, deleted: { reactions: 0, recognitions: 0, weeklyDigests: 0 }, error: recognitionsError.message };
        }

        // 3. Delete weekly_digests
        const { error: digestsError } = await supabase
            .from('weekly_digests')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (digestsError) {
            console.error('Error deleting weekly_digests:', digestsError);
            return {
                success: false,
                deleted: { reactions: 0, recognitions: 0, weeklyDigests: 0 },
                error: digestsError.message
            };
        }

        // 4. Optionally delete user_badges
        if (includeBadges) {
            const { error: badgesError } = await supabase
                .from('user_badges')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (badgesError) {
                console.error('Error deleting user_badges:', badgesError);
                return {
                    success: false,
                    deleted: {
                        reactions: 0,
                        recognitions: 0,
                        weeklyDigests: 0,
                        userBadges: 0
                    },
                    error: badgesError.message
                };
            }
        }

        return {
            success: true,
            deleted: {
                reactions: -1, // Count not available without extra query
                recognitions: -1,
                weeklyDigests: -1,
                ...(includeBadges && { userBadges: -1 }),
            },
        };
    } catch (err) {
        console.error('Unexpected error during deletion:', err);
        return {
            success: false,
            deleted: { reactions: 0, recognitions: 0, weeklyDigests: 0 },
            error: 'Unexpected error occurred'
        };
    }
}

/**
 * Delete history from the last 24 hours only
 */
export async function deleteRecentHistory(): Promise<{
    success: boolean;
    deleted: {
        reactions: number;
        recognitions: number;
    };
    error?: string;
}> {
    try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Get recognition IDs from last 24h first
        const { data: recentRecognitions } = await supabase
            .from('recognitions')
            .select('id')
            .gte('created_at', since);

        const recognitionIds = recentRecognitions?.map(r => r.id) || [];

        // Delete reactions for those recognitions
        if (recognitionIds.length > 0) {
            await supabase
                .from('reactions')
                .delete()
                .in('recognition_id', recognitionIds);
        }

        // Delete recognitions from last 24h
        const { error } = await supabase
            .from('recognitions')
            .delete()
            .gte('created_at', since);

        if (error) {
            return { success: false, deleted: { reactions: 0, recognitions: 0 }, error: error.message };
        }

        return {
            success: true,
            deleted: {
                reactions: recognitionIds.length, // Approximate
                recognitions: recognitionIds.length,
            },
        };
    } catch (err) {
        console.error('Unexpected error during recent deletion:', err);
        return { success: false, deleted: { reactions: 0, recognitions: 0 }, error: 'Unexpected error occurred' };
    }
}
