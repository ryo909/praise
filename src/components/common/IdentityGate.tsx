import { useState, useMemo } from 'react';
import { useCurrentUser } from '../../providers/CurrentUserProvider';
import type { User } from '../../lib/types';
import './IdentityGate.css';

export function IdentityGate() {
    const { users, isIdentityModalOpen, setCurrentUser, closeIdentityModal, currentUser } = useCurrentUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        return users.filter(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.dept?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    const handleConfirm = () => {
        if (selectedUser) {
            setCurrentUser(selectedUser);
            setSearchQuery('');
            setSelectedUser(null);
        }
    };

    if (!isIdentityModalOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal identity-modal">
                <div className="modal-header">
                    <h2 className="identity-title">🎉 あなたは誰？</h2>
                    <p className="identity-subtitle">この端末で一度だけ設定します（30秒）</p>
                </div>

                <div className="modal-body">
                    <input
                        type="text"
                        className="input identity-search"
                        placeholder="名前で検索..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                    />

                    <div className="identity-user-list">
                        {filteredUsers.map(user => (
                            <button
                                key={user.id}
                                className={`identity-user-item ${selectedUser?.id === user.id ? 'selected' : ''}`}
                                onClick={() => setSelectedUser(user)}
                            >
                                <div className="avatar">{user.name.charAt(0)}</div>
                                <div className="identity-user-info">
                                    <span className="identity-user-name">{user.name}</span>
                                    {user.dept && <span className="identity-user-dept">{user.dept}</span>}
                                </div>
                                {selectedUser?.id === user.id && <span className="identity-check">✓</span>}
                            </button>
                        ))}
                        {filteredUsers.length === 0 && (
                            <div className="identity-no-results">
                                該当するユーザーがいません
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    {currentUser && (
                        <button className="btn btn-ghost" onClick={closeIdentityModal}>
                            キャンセル
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        disabled={!selectedUser}
                        onClick={handleConfirm}
                    >
                        これでOK
                    </button>
                </div>
            </div>
        </div>
    );
}
