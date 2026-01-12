import { useState } from 'react';
import { toggleClap } from '../../lib/api/reactions';
import { useCurrentUser } from '../../providers/CurrentUserProvider';
import './ClapButton.css';

interface ClapButtonProps {
    recognitionId: string;
    count: number;
    hasClapped: boolean;
    disabled?: boolean;
    onToggle: (recognitionId: string, hasClapped: boolean) => void;
}

export function ClapButton({
    recognitionId,
    count,
    hasClapped,
    disabled = false,
    onToggle
}: ClapButtonProps) {
    const { currentUser } = useCurrentUser();
    const [isLoading, setIsLoading] = useState(false);
    const [localHasClapped, setLocalHasClapped] = useState(hasClapped);
    const [localCount, setLocalCount] = useState(count);

    const handleClick = async () => {
        if (!currentUser || disabled || isLoading) return;

        // Optimistic update
        const newHasClapped = !localHasClapped;
        setLocalHasClapped(newHasClapped);
        setLocalCount(prev => newHasClapped ? prev + 1 : prev - 1);

        setIsLoading(true);
        try {
            const result = await toggleClap(recognitionId, currentUser.id, localHasClapped);
            if (!result.success) {
                // Revert on failure
                setLocalHasClapped(localHasClapped);
                setLocalCount(prev => localHasClapped ? prev + 1 : prev - 1);
            } else {
                onToggle(recognitionId, result.hasClapped);
            }
        } catch {
            // Revert on error
            setLocalHasClapped(localHasClapped);
            setLocalCount(prev => localHasClapped ? prev + 1 : prev - 1);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            className={`clap-button ${localHasClapped ? 'clapped' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={handleClick}
            disabled={disabled || isLoading}
            title={disabled ? 'あなたの投稿です' : localHasClapped ? '取り消す' : '👏'}
        >
            <span className="clap-icon">👏</span>
            {localCount > 0 && <span className="clap-count">{localCount}</span>}
        </button>
    );
}
