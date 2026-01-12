import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCurrentUser } from '../providers/CurrentUserProvider';
import { fetchUserById } from '../lib/api/users';
import { fetchRecognitionsForUser } from '../lib/api/recognitions';
import { fetchUserBadges } from '../lib/api/badges';
import { formatRelativeTime } from '../lib/utils/dates';
import type { User, Recognition, UserBadge } from '../lib/types';
import './Profile.css';

export function Profile() {
    const { id } = useParams<{ id: string }>();
    const { currentUser, users } = useCurrentUser();

    const [user, setUser] = useState<User | null>(null);
    const [receivedRecognitions, setReceivedRecognitions] = useState<Recognition[]>([]);
    const [sentRecognitions, setSentRecognitions] = useState<Recognition[]>([]);
    const [badges, setBadges] = useState<UserBadge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

    useEffect(() => {
        async function load() {
            if (!id) return;

            setIsLoading(true);

            const [fetchedUser, received, sent, userBadges] = await Promise.all([
                fetchUserById(id),
                fetchRecognitionsForUser(id, 'received'),
                fetchRecognitionsForUser(id, 'sent'),
                fetchUserBadges(id),
            ]);

            setUser(fetchedUser);

            // Enrich recognitions with user data
            const userMap = new Map(users.map(u => [u.id, u]));

            setReceivedRecognitions(received.map(r => ({
                ...r,
                from_user: userMap.get(r.from_user_id),
                to_user: userMap.get(r.to_user_id),
            })));

            setSentRecognitions(sent.map(r => ({
                ...r,
                from_user: userMap.get(r.from_user_id),
                to_user: userMap.get(r.to_user_id),
            })));

            setBadges(userBadges);
            setIsLoading(false);
        }
        load();
    }, [id, users]);

    if (isLoading || !user) {
        return (
            <div className="profile-page">
                <div className="profile-header-skeleton skeleton" />
            </div>
        );
    }

    const isOwnProfile = currentUser?.id === user.id;
    const recognitions = activeTab === 'received' ? receivedRecognitions : sentRecognitions;

    return (
        <div className="profile-page">
            <div className="profile-header">
                <div className="avatar avatar-xl">{user.name.charAt(0)}</div>
                <div className="profile-info">
                    <h1 className="profile-name">{user.name}</h1>
                    {user.dept && <p className="profile-dept">{user.dept}</p>}
                    {isOwnProfile && (
                        <Link to="/settings" className="btn btn-ghost profile-edit">
                            設定を変更
                        </Link>
                    )}
                </div>
            </div>

            <div className="profile-stats">
                <div className="profile-stat">
                    <span className="profile-stat-value">{receivedRecognitions.length}</span>
                    <span className="profile-stat-label">受け取った称賛</span>
                </div>
                <div className="profile-stat">
                    <span className="profile-stat-value">{sentRecognitions.length}</span>
                    <span className="profile-stat-label">送った称賛</span>
                </div>
                <div className="profile-stat">
                    <span className="profile-stat-value">{badges.length}</span>
                    <span className="profile-stat-label">称号</span>
                </div>
            </div>

            {badges.length > 0 && (
                <div className="profile-badges">
                    <h2 className="profile-section-title">🏅 称号</h2>
                    <div className="profile-badges-list">
                        {badges.map(ub => (
                            <div key={ub.id} className="profile-badge">
                                <span className="profile-badge-emoji">{ub.badge?.emoji}</span>
                                <span className="profile-badge-label">{ub.badge?.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="profile-recognitions">
                <div className="profile-tabs">
                    <button
                        className={`profile-tab ${activeTab === 'received' ? 'active' : ''}`}
                        onClick={() => setActiveTab('received')}
                    >
                        受け取った
                    </button>
                    <button
                        className={`profile-tab ${activeTab === 'sent' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sent')}
                    >
                        送った
                    </button>
                </div>

                <div className="profile-recognition-list">
                    {recognitions.length === 0 ? (
                        <p className="profile-no-recognitions">まだありません</p>
                    ) : (
                        recognitions.map(r => (
                            <div key={r.id} className="profile-recognition-item">
                                <Link
                                    to={`/profile/${activeTab === 'received' ? r.from_user_id : r.to_user_id}`}
                                    className="profile-recognition-user"
                                >
                                    <div className="avatar avatar-sm">
                                        {activeTab === 'received'
                                            ? r.from_user?.name.charAt(0)
                                            : r.to_user?.name.charAt(0)
                                        }
                                    </div>
                                    <span className="profile-recognition-name">
                                        {activeTab === 'received' ? r.from_user?.name : r.to_user?.name}
                                    </span>
                                </Link>
                                <p className="profile-recognition-message">{r.message || '(メッセージなし)'}</p>
                                <time className="profile-recognition-time">
                                    {formatRelativeTime(r.created_at)}
                                </time>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
