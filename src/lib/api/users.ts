import { supabase } from '../supabase';
import type { User } from '../types';

export async function fetchUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }

    return data || [];
}

export async function fetchUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching user:', error);
        return null;
    }

    return data;
}

export async function createUser(name: string, dept?: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .insert({ name, dept })
        .select()
        .single();

    if (error) {
        console.error('Error creating user:', error);
        return null;
    }

    return data;
}

export async function searchUsers(query: string): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10);

    if (error) {
        console.error('Error searching users:', error);
        return [];
    }

    return data || [];
}
