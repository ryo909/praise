import { Link } from 'react-router-dom';
import { ClapButton } from './ClapButton';
import { formatRelativeTime } from '../../lib/utils/dates';
import { useToast } from '../../providers/ToastProvider';
import type { Recognition } from '../../lib/types';
import './PraiseCard.css';

interface PraiseCardProps {
    recognition: Recognition;
    currentUserId: string;
    onClapToggle: (recognitionId: string, hasClapped: boolean) => void;
}

export function PraiseCard({ recognition, currentUserId, onClapToggle }: PraiseCardProps) {
    const { showToast } = useToast();

    const handleCopyLink = () => {
        const url = `${window.location.origin}/feed?highlight=${recognition.id}`;
        navigator.clipboard.writeText(url);
        showToast('リンクをコピーしました');
    };

    return (
        <article className="praise-card">
            <div className="praise-card-header">
                <div className="praise-card-users">
                    <Link to={`/profile/${recognition.from_user?.id}`} className="praise-card-user">
                        <div className="avatar">{recognition.from_user?.name.charAt(0)}</div>
                        <span className="praise-card-user-name">{recognition.from_user?.name}</span>
                    </Link>
                    <span className="praise-card-arrow">→</span>
                    <Link to={`/profile/${recognition.to_user?.id}`} className="praise-card-user">
                        <div className="avatar">{recognition.to_user?.name.charAt(0)}</div>
                        <span className="praise-card-user-name">{recognition.to_user?.name}</span>
                    </Link>
                </div>
                <time className="praise-card-time">
                    {formatRelativeTime(recognition.created_at)}
                </time>
            </div>

            {recognition.message && (
                <p className="praise-card-message">{recognition.message}</p>
            )}

            <div className="praise-card-actions">
                <ClapButton
                    recognitionId={recognition.id}
                    count={recognition.clap_count || 0}
                    hasClapped={recognition.user_has_clapped || false}
                    disabled={recognition.from_user_id === currentUserId}
                    onToggle={onClapToggle}
                />
                <button className="btn btn-ghost praise-card-action" onClick={handleCopyLink}>
                    🔗
                </button>
            </div>
        </article>
    );
}
