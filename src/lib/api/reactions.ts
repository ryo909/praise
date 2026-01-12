import { supabase } from '../supabase';
import type { Reaction } from '../types';

export async function addClap(
    recognitionId: string,
    userId: string
): Promise<Reaction | null> {
    const { data, error } = await supabase
        .from('reactions')
        .insert({
            recognition_id: recognitionId,
            user_id: userId,
            type: 'clap',
        })
        .select()
        .single();

    if (error) {
        // Might be duplicate, which is expected
        if (error.code === '23505') {
            console.log('User already clapped');
            return null;
        }
        console.error('Error adding clap:', error);
        return null;
    }

    return data;
}

export async function removeClap(
    recognitionId: string,
    userId: string
): Promise<boolean> {
    const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('recognition_id', recognitionId)
        .eq('user_id', userId)
        .eq('type', 'clap');

    if (error) {
        console.error('Error removing clap:', error);
        return false;
    }

    return true;
}

export async function toggleClap(
    recognitionId: string,
    userId: string,
    hasClapped: boolean
): Promise<{ success: boolean; hasClapped: boolean }> {
    if (hasClapped) {
        const success = await removeClap(recognitionId, userId);
        return { success, hasClapped: success ? false : true };
    } else {
        const reaction = await addClap(recognitionId, userId);
        return { success: reaction !== null, hasClapped: reaction !== null };
    }
}
