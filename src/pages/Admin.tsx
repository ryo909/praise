import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../providers/ToastProvider';
import { useCurrentUser } from '../providers/CurrentUserProvider';
import { createUser } from '../lib/api/users';
import { generateWeeklyDigest, getWeekRange } from '../lib/api/weekly';
import { fetchBadges, fetchWeekBadges, assignBadge, removeBadge } from '../lib/api/badges';
import { deleteAllHistory, deleteRecentHistory } from '../lib/api/admin';
import { getWeekStartDate, getLastWeekStartDate } from '../lib/utils/dates';
import type { Badge, UserBadge } from '../lib/types';
import './Admin.css';

// Read passcode from environment variable
const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || '';
const ADMIN_STORAGE_KEY = 'adminUnlocked';

export function Admin() {
    const navigate = useNavigate();
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

    // Deletion state
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteType, setDeleteType] = useState<'all' | 'allWithBadges' | 'recent' | null>(null);
    const [confirmText, setConfirmText] = useState('');

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
        if (!ADMIN_PASSCODE) {
            showToast('Admin パスコードが設定されていません', 'error');
            return;
        }
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

    // Delete handlers
    const openDeleteConfirm = (type: 'all' | 'allWithBadges' | 'recent') => {
        setDeleteType(type);
        setConfirmText('');
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        setShowDeleteConfirm(false);
        setDeleteType(null);
        setConfirmText('');
    };

    const handleDelete = async () => {
        if (confirmText !== 'DELETE') {
            showToast('確認のため "DELETE" と入力してください', 'error');
            return;
        }

        setIsDeleting(true);

        let result;
        if (deleteType === 'recent') {
            result = await deleteRecentHistory();
            if (result.success) {
                showToast(`直近24時間の履歴を削除しました（称賛: ${result.deleted.recognitions}件）`);
            }
        } else {
            const includeBadges = deleteType === 'allWithBadges';
            result = await deleteAllHistory(includeBadges);
            if (result.success) {
                const badgeMsg = includeBadges ? `、称号: ${result.deleted.userBadges}件` : '';
                showToast(`履歴を全削除しました（称賛: ${result.deleted.recognitions}件、週次: ${result.deleted.weeklyDigests}件${badgeMsg}）`);
            }
        }

        if (!result.success) {
            showToast(`削除に失敗しました: ${result.error}`, 'error');
        }

        setIsDeleting(false);
        closeDeleteConfirm();

        if (result.success) {
            // Prompt user to re-select if data is cleared
            const shouldLogout = window.confirm('データを削除しました。ユーザーを再選択しますか？');
            if (shouldLogout) {
                localStorage.removeItem('myUserId');
                navigate('/');
                window.location.reload();
            } else {
                navigate('/feed');
            }
        }
    };

    if (!isUnlocked) {
        return (
            <div className="admin-page">
                <div className="admin-lock">
                    <h1 className="admin-lock-title">🔒 Admin</h1>
                    <p className="admin-lock-desc">パスコードを入力してください</p>
                    {!ADMIN_PASSCODE && (
                        <p className="admin-lock-warning">
                            ⚠️ VITE_ADMIN_PASSCODE が設定されていません
                        </p>
                    )}
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

            {/* Danger Zone - History Deletion */}
            <section className="admin-section admin-danger-zone">
                <h2 className="admin-section-title admin-danger-title">⚠️ 危険な操作</h2>
                <div className="admin-card admin-danger-card">
                    <p className="admin-danger-warning">
                        以下の操作は<strong>元に戻せません</strong>。テスト用途やリセット時にのみ使用してください。
                    </p>

                    <div className="admin-danger-buttons">
                        <button
                            className="btn btn-danger"
                            onClick={() => openDeleteConfirm('recent')}
                        >
                            🕐 直近24時間の履歴を削除
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={() => openDeleteConfirm('all')}
                        >
                            🗑️ 履歴を全削除（テスト用）
                        </button>
                        <button
                            className="btn btn-danger-outline"
                            onClick={() => openDeleteConfirm('allWithBadges')}
                        >
                            💀 称号も含めて全削除
                        </button>
                    </div>

                    <div className="admin-danger-info">
                        <p><strong>履歴を全削除：</strong>recognitions, reactions, weekly_digests を削除</p>
                        <p><strong>称号も含めて全削除：</strong>上記 + user_badges を削除</p>
                        <p><strong>※ユーザー（users）は削除されません</strong></p>
                    </div>
                </div>
            </section>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay">
                    <div className="modal admin-delete-modal">
                        <div className="modal-header">
                            <h2 className="admin-delete-modal-title">⚠️ 本当に削除しますか？</h2>
                        </div>
                        <div className="modal-body">
                            <p className="admin-delete-modal-desc">
                                {deleteType === 'recent' && '直近24時間の称賛データが削除されます。'}
                                {deleteType === 'all' && 'すべての称賛、リアクション、週次まとめが削除されます。'}
                                {deleteType === 'allWithBadges' && 'すべての称賛、リアクション、週次まとめ、称号が削除されます。'}
                            </p>
                            <p className="admin-delete-modal-warning">
                                <strong>この操作は元に戻せません。</strong>
                            </p>
                            <p className="admin-delete-modal-confirm-label">
                                確認のため <code>DELETE</code> と入力してください：
                            </p>
                            <input
                                type="text"
                                className="input admin-delete-confirm-input"
                                value={confirmText}
                                onChange={e => setConfirmText(e.target.value)}
                                placeholder="DELETE"
                                autoFocus
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={closeDeleteConfirm}>
                                キャンセル
                            </button>
                            <button
                                className="btn btn-danger"
                                disabled={confirmText !== 'DELETE' || isDeleting}
                                onClick={handleDelete}
                            >
                                {isDeleting ? '削除中...' : '削除する'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
