import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '../lib/types';
import { fetchUsers, fetchUserById } from '../lib/api/users';

interface CurrentUserContextType {
    currentUser: User | null;
    users: User[];
    isLoading: boolean;
    isIdentityModalOpen: boolean;
    setCurrentUser: (user: User) => void;
    openIdentityModal: () => void;
    closeIdentityModal: () => void;
    refreshUsers: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextType | null>(null);

const STORAGE_KEY = 'myUserId';

export function CurrentUserProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUserState] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);

    const refreshUsers = useCallback(async (): Promise<void> => {
        const fetchedUsers = await fetchUsers();
        setUsers(fetchedUsers);
    }, []);

    const loadCurrentUser = useCallback(async () => {
        setIsLoading(true);

        const fetchedUsers = await fetchUsers();
        setUsers(fetchedUsers);
        const storedId = localStorage.getItem(STORAGE_KEY);

        if (storedId) {
            const user = fetchedUsers.find(u => u.id === storedId);
            if (user) {
                setCurrentUserState(user);
            } else {
                // Stored user not found, try fetching directly
                const fetchedUser = await fetchUserById(storedId);
                if (fetchedUser) {
                    setCurrentUserState(fetchedUser);
                } else {
                    // User doesn't exist anymore, show modal
                    localStorage.removeItem(STORAGE_KEY);
                    setIsIdentityModalOpen(true);
                }
            }
        } else {
            // No stored user, show modal
            setIsIdentityModalOpen(true);
        }

        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadCurrentUser();
    }, [loadCurrentUser]);

    const setCurrentUser = useCallback((user: User) => {
        localStorage.setItem(STORAGE_KEY, user.id);
        setCurrentUserState(user);
        setIsIdentityModalOpen(false);
    }, []);

    const openIdentityModal = useCallback(() => {
        setIsIdentityModalOpen(true);
    }, []);

    const closeIdentityModal = useCallback(() => {
        if (currentUser) {
            setIsIdentityModalOpen(false);
        }
    }, [currentUser]);

    return (
        <CurrentUserContext.Provider
            value={{
                currentUser,
                users,
                isLoading,
                isIdentityModalOpen,
                setCurrentUser,
                openIdentityModal,
                closeIdentityModal,
                refreshUsers,
            }}
        >
            {children}
        </CurrentUserContext.Provider>
    );
}

export function useCurrentUser() {
    const context = useContext(CurrentUserContext);
    if (!context) {
        throw new Error('useCurrentUser must be used within CurrentUserProvider');
    }
    return context;
}
