import { useState, useEffect } from 'react';
import { useToast } from '../providers/ToastProvider';
import { useCurrentUser } from '../providers/CurrentUserProvider';
import { createUser } from '../lib/api/users';
import { generateWeeklyDigest, getWeekRange } from '../lib/api/weekly';
import { fetchBadges, fetchWeekBadges, assignBadge, removeBadge } from '../lib/api/badges';
import { getWeekStartDate, getLastWeekStartDate } from '../lib/utils/dates';
import type { Badge, UserBadge } from '../lib/types';
import './Admin.css';

const ADMIN_PASSCODE = '1234';
const ADMIN_STORAGE_KEY = 'adminUnlocked';

export function Admin() {
    const { showToast } = useToast();
    const { users, refreshUsers } = useCurrentUser();

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserDept, setNewUserDept] = useState('');
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [weekBadges, setWeekBadges] = useState<UserBadge[]>([]);
    const [selectedBadge, setSelectedBadge] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [weekFilter, setWeekFilter] = useState<'this' | 'last'>('this');

    const currentWeekStart = weekFilter === 'this' ? getWeekStartDate() : getLastWeekStartDate();

    useEffect(() => {
        const unlocked = localStorage.getItem(ADMIN_STORAGE_KEY) === '1';
        setIsUnlocked(unlocked);
    }, []);

    useEffect(() => {
        if (isUnlocked) {
            fetchBadges().then(setBadges);
            fetchWeekBadges(currentWeekStart).then(setWeekBadges);
        }
    }, [isUnlocked, currentWeekStart]);

    const handleUnlock = () => {
        if (passcode === ADMIN_PASSCODE) {
            localStorage.setItem(ADMIN_STORAGE_KEY, '1');
            setIsUnlocked(true);
            setPasscode('');
        } else {
            showToast('パスコードが違います', 'error');
        }
    };

    const handleLock = () => {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        setIsUnlocked(false);
    };

    const handleCreateUser = async () => {
        if (!newUserName.trim()) {
            showToast('名前を入力してください', 'error');
            return;
        }

        setIsCreatingUser(true);
        const user = await createUser(newUserName.trim(), newUserDept.trim() || undefined);
        if (user) {
            showToast(`${user.name}を追加しました`);
            setNewUserName('');
            setNewUserDept('');
            await refreshUsers();
        } else {
            showToast('ユーザー追加に失敗しました', 'error');
        }
        setIsCreatingUser(false);
    };

    const handleGenerateDigest = async (week: 'this' | 'last') => {
        setIsGeneratingDigest(true);

        const date = week === 'last'
            ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            : new Date();
        const { start, end } = getWeekRange(date);

        const digest = await generateWeeklyDigest(start, end);

        if (digest) {
            showToast(`週次まとめを生成しました（${digest.stats_json.total_recognitions}件）`);
        } else {
            showToast('週次まとめの生成に失敗しました', 'error');
        }
        setIsGeneratingDigest(false);
    };

    const handleAssignBadge = async () => {
        if (!selectedBadge || !selectedUser) {
            showToast('バッジとユーザーを選択してください', 'error');
            return;
        }

        const badge = await assignBadge(selectedUser, selectedBadge, currentWeekStart);
        if (badge) {
            showToast('称号を付与しました');
            setWeekBadges(await fetchWeekBadges(currentWeekStart));
            setSelectedBadge('');
            setSelectedUser('');
        } else {
            showToast('称号の付与に失敗しました', 'error');
        }
    };

    const handleRemoveBadge = async (userBadgeId: string) => {
        const success = await removeBadge(userBadgeId);
        if (success) {
            showToast('称号を削除しました');
            setWeekBadges(await fetchWeekBadges(currentWeekStart));
        } else {
            showToast('称号の削除に失敗しました', 'error');
        }
    };

    if (!isUnlocked) {
        return (
            <div className="admin-page">
                <div className="admin-lock">
                    <h1 className="admin-lock-title">🔒 Admin</h1>
                    <p className="admin-lock-desc">パスコードを入力してください</p>
                    <input
                        type="password"
                        className="input admin-passcode-input"
                        value={passcode}
                        onChange={e => setPasscode(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                        placeholder="パスコード"
                        autoFocus
                    />
                    <button className="btn btn-primary" onClick={handleUnlock}>
                        ロック解除
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1 className="page-title">🔧 Admin</h1>
                <button className="btn btn-ghost" onClick={handleLock}>
                    🔒 ロック
                </button>
            </div>

            {/* User Management */}
            <section className="admin-section">
                <h2 className="admin-section-title">ユーザー管理</h2>
                <div className="admin-card">
                    <div className="admin-form">
                        <input
                            type="text"
                            className="input"
                            placeholder="名前（必須）"
                            value={newUserName}
                            onChange={e => setNewUserName(e.target.value)}
                        />
                        <input
                            type="text"
                            className="input"
                            placeholder="部署（任意）"
                            value={newUserDept}
                            onChange={e => setNewUserDept(e.target.value)}
                        />
                        <button
                            className="btn btn-primary"
                            disabled={isCreatingUser}
                            onClick={handleCreateUser}
                        >
                            {isCreatingUser ? '追加中...' : 'ユーザー追加'}
                        </button>
                    </div>
                    <div className="admin-user-list">
                        {users.map(user => (
                            <div key={user.id} className="admin-user-item">
                                <div className="avatar avatar-sm">{user.name.charAt(0)}</div>
                                <span className="admin-user-name">{user.name}</span>
                                {user.dept && <span className="admin-user-dept">{user.dept}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Weekly Digest */}
            <section className="admin-section">
                <h2 className="admin-section-title">週次まとめ生成</h2>
                <div className="admin-card">
                    <div className="admin-form">
                        <button
                            className="btn btn-secondary"
                            disabled={isGeneratingDigest}
                            onClick={() => handleGenerateDigest('this')}
                        >
                            {isGeneratingDigest ? '生成中...' : '今週のまとめを生成'}
                        </button>
                        <button
                            className="btn btn-secondary"
                            disabled={isGeneratingDigest}
                            onClick={() => handleGenerateDigest('last')}
                        >
                            {isGeneratingDigest ? '生成中...' : '先週のまとめを生成'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Badge Assignment */}
            <section className="admin-section">
                <h2 className="admin-section-title">称号付与</h2>
                <div className="admin-card">
                    <div className="admin-week-toggle">
                        <button
                            className={`chip ${weekFilter === 'this' ? 'active' : ''}`}
                            onClick={() => setWeekFilter('this')}
                        >
                            今週
                        </button>
                        <button
                            className={`chip ${weekFilter === 'last' ? 'active' : ''}`}
                            onClick={() => setWeekFilter('last')}
                        >
                            先週
                        </button>
                    </div>

                    <div className="admin-form">
                        <select
                            className="input"
                            value={selectedBadge}
                            onChange={e => setSelectedBadge(e.target.value)}
                        >
                            <option value="">称号を選択...</option>
                            {badges.map(badge => (
                                <option key={badge.id} value={badge.id}>
                                    {badge.emoji} {badge.label}
                                </option>
                            ))}
                        </select>
                        <select
                            className="input"
                            value={selectedUser}
                            onChange={e => setSelectedUser(e.target.value)}
                        >
                            <option value="">ユーザーを選択...</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                        <button className="btn btn-primary" onClick={handleAssignBadge}>
                            付与
                        </button>
                    </div>

                    {weekBadges.length > 0 && (
                        <div className="admin-badge-list">
                            <h3 className="admin-badge-list-title">付与済み</h3>
                            {weekBadges.map(ub => (
                                <div key={ub.id} className="admin-badge-item">
                                    <span className="admin-badge-emoji">{ub.badge?.emoji}</span>
                                    <span className="admin-badge-label">{ub.badge?.label}</span>
                                    <span className="admin-badge-user">{users.find(u => u.id === ub.user_id)?.name}</span>
                                    <button
                                        className="btn btn-ghost admin-badge-remove"
                                        onClick={() => handleRemoveBadge(ub.id)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
