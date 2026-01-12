import { useState, useCallback, useEffect } from 'react';
import { useCurrentUser } from '../../providers/CurrentUserProvider';
import { useToast } from '../../providers/ToastProvider';
import { createRecognition, fetchRecentRecipients } from '../../lib/api/recognitions';
import { PRAISE_TEMPLATES } from '../../lib/utils/templates';
import { EFFECT_OPTIONS, playEffect } from '../../lib/utils/effects';
import { ShareSuccessModal } from '../share/ShareSuccessModal';
import type { User, Recognition, EffectKey } from '../../lib/types';
import './QuickPraiseComposer.css';

interface QuickPraiseComposerProps {
    onSuccess?: (recognition: Recognition, toUser: User) => void;
    compact?: boolean;
}

export function QuickPraiseComposer({ onSuccess, compact = false }: QuickPraiseComposerProps) {
    const { currentUser, users, isLoading, openIdentityModal } = useCurrentUser();
    const { showToast } = useToast();

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [additionalMessage, setAdditionalMessage] = useState('');
    const [selectedEffect, setSelectedEffect] = useState<EffectKey>('confetti');
    const [recentRecipients, setRecentRecipients] = useState<User[]>([]);
    const [showUserSelect, setShowUserSelect] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Share modal state
    const [showShareModal, setShowShareModal] = useState(false);
    const [sentRecognition, setSentRecognition] = useState<Recognition | null>(null);
    const [sentToUser, setSentToUser] = useState<User | null>(null);

    useEffect(() => {
        if (currentUser?.id) {
            fetchRecentRecipients(currentUser.id).then(recipients => {
                // Filter out any invalid entries (in case of DB reset)
                const validRecipients = recipients.filter(r => r && r.id && r.name);
                setRecentRecipients(validRecipients);
            });
        }
    }, [currentUser?.id]);

    // Filter users - exclude current user
    const availableUsers = users.filter(u => u.id !== currentUser?.id);

    const filteredUsers = availableUsers.filter(u => {
        if (!userSearchQuery.trim()) return true;
        return u.name.toLowerCase().includes(userSearchQuery.toLowerCase());
    });

    const getMessage = useCallback(() => {
        const parts: string[] = [];
        if (selectedTemplate) parts.push(selectedTemplate);
        if (additionalMessage.trim()) parts.push(additionalMessage.trim());
        return parts.join(' ');
    }, [selectedTemplate, additionalMessage]);

    const canSend = selectedUser !== null && selectedUser.id;
    const hasContent = selectedTemplate || additionalMessage.trim();

    const handleSend = async () => {
        // Validate current user
        if (!currentUser?.id) {
            showToast('ログインが必要です', 'error');
            openIdentityModal();
            return;
        }

        // Validate recipient
        if (!selectedUser?.id) {
            showToast('宛先を選んでください', 'error');
            return;
        }

        // Validate that selectedUser.id is a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(selectedUser.id)) {
            console.error('Invalid selectedUser.id:', selectedUser);
            showToast('宛先が不正です。ページを再読み込みしてください', 'error');
            return;
        }

        // Show hint if no content
        if (!hasContent) {
            setShowHint(true);
            return;
        }

        setIsSending(true);

        // Debug log
        console.log('Sending recognition:', {
            from: currentUser.id,
            to: selectedUser.id,
            toName: selectedUser.name,
            message: getMessage(),
            effect: selectedEffect,
        });

        try {
            const recognition = await createRecognition(
                currentUser.id,
                selectedUser.id,
                getMessage(),
                selectedEffect
            );

            if (recognition) {
                // Play the selected effect
                playEffect(selectedEffect);

                // Store info for share modal
                const enrichedRecognition: Recognition = {
                    ...recognition,
                    from_user: currentUser,
                    to_user: selectedUser,
                };
                setSentRecognition(enrichedRecognition);
                setSentToUser(selectedUser);
                setShowShareModal(true);

                if (onSuccess) {
                    onSuccess(recognition, selectedUser);
                }

                // Reset form
                setSelectedUser(null);
                setSelectedTemplate(null);
                setAdditionalMessage('');
                setSelectedEffect('confetti');
                setShowHint(false);
            } else {
                showToast('送信に失敗しました（コンソールを確認）', 'error');
            }
        } catch (err) {
            console.error('Send error:', err);
            showToast('送信に失敗しました', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleCloseShareModal = () => {
        setShowShareModal(false);
        setSentRecognition(null);
        setSentToUser(null);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className={`composer ${compact ? 'composer-compact' : ''}`}>
                <div className="composer-loading">読み込み中...</div>
            </div>
        );
    }

    // No users available
    if (availableUsers.length === 0) {
        return (
            <div className={`composer ${compact ? 'composer-compact' : ''}`}>
                <div className="composer-header">
                    <h3 className="composer-title">✨ 称賛を送る</h3>
                </div>
                <div className="composer-empty">
                    <p>送信できるユーザーがいません</p>
                    <p className="composer-empty-hint">Adminでユーザーを追加してください</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={`composer ${compact ? 'composer-compact' : ''}`}>
                <div className="composer-header">
                    <h3 className="composer-title">✨ 称賛を送る（15秒）</h3>
                    <p className="composer-hint">テンプレを押すだけでも送れます</p>
                </div>

                {/* Recipient Selection */}
                <div className="composer-section">
                    <label className="composer-label">宛先</label>

                    {/* Recent Recipients */}
                    {recentRecipients.length > 0 && !selectedUser && (
                        <div className="composer-recent">
                            <span className="composer-recent-label">最近:</span>
                            {recentRecipients.map(user => (
                                <button
                                    key={user.id}
                                    className="composer-recent-avatar"
                                    onClick={() => {
                                        console.log('Selected recent user:', user);
                                        setSelectedUser(user);
                                    }}
                                    title={user.name}
                                >
                                    <div className="avatar avatar-sm">{user.name.charAt(0)}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedUser ? (
                        <div className="composer-selected-user">
                            <div className="avatar">{selectedUser.name.charAt(0)}</div>
                            <span className="composer-selected-name">{selectedUser.name}</span>
                            <button
                                className="composer-clear-user"
                                onClick={() => setSelectedUser(null)}
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <div className="composer-user-select">
                            <input
                                type="text"
                                className="input"
                                placeholder="名前で検索..."
                                value={userSearchQuery}
                                onChange={e => {
                                    setUserSearchQuery(e.target.value);
                                    setShowUserSelect(true);
                                }}
                                onFocus={() => setShowUserSelect(true)}
                            />
                            {showUserSelect && (
                                <div className="composer-user-dropdown">
                                    {filteredUsers.slice(0, 8).map(user => (
                                        <button
                                            key={user.id}
                                            className="composer-user-option"
                                            onClick={() => {
                                                console.log('Selected user:', user);
                                                setSelectedUser(user);
                                                setShowUserSelect(false);
                                                setUserSearchQuery('');
                                            }}
                                        >
                                            <div className="avatar avatar-sm">{user.name.charAt(0)}</div>
                                            <div className="composer-user-option-info">
                                                <span className="composer-user-option-name">{user.name}</span>
                                                {user.dept && <span className="composer-user-option-dept">{user.dept}</span>}
                                            </div>
                                        </button>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <div className="composer-no-results">該当なし</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Templates */}
                <div className="composer-section">
                    <label className="composer-label">テンプレート</label>
                    <div className="composer-templates">
                        {PRAISE_TEMPLATES.map((template, idx) => (
                            <button
                                key={idx}
                                className={`chip ${selectedTemplate === template ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedTemplate(selectedTemplate === template ? null : template);
                                    setShowHint(false);
                                }}
                            >
                                {template}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Additional Message */}
                <div className="composer-section">
                    <label className="composer-label">追記（任意）</label>
                    <textarea
                        className="input composer-textarea"
                        placeholder="一言添えることもできます..."
                        value={additionalMessage}
                        onChange={e => {
                            setAdditionalMessage(e.target.value);
                            setShowHint(false);
                        }}
                        rows={2}
                    />
                </div>

                {/* Effect Selection */}
                <div className="composer-section">
                    <label className="composer-label">演出</label>
                    <select
                        className="input composer-effect-select"
                        value={selectedEffect}
                        onChange={e => setSelectedEffect(e.target.value as EffectKey)}
                    >
                        {EFFECT_OPTIONS.map(option => (
                            <option key={option.key} value={option.key}>
                                {option.emoji} {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Hint */}
                {showHint && (
                    <div className="composer-warning">
                        💡 テンプレを押すだけでも送れます
                    </div>
                )}

                {/* Send Button */}
                <div className="composer-actions">
                    <button
                        className="btn btn-primary composer-send"
                        disabled={!canSend || isSending}
                        onClick={handleSend}
                    >
                        {isSending ? '送信中...' : '称賛を送る'}
                    </button>
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && sentRecognition && sentToUser && (
                <ShareSuccessModal
                    recognition={sentRecognition}
                    toUser={sentToUser}
                    onClose={handleCloseShareModal}
                />
            )}
        </>
    );
}
