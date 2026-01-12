import { useState, useCallback, useEffect } from 'react';
import { useCurrentUser } from '../../providers/CurrentUserProvider';
import { useToast } from '../../providers/ToastProvider';
import { createRecognitions, fetchRecentRecipients } from '../../lib/api/recognitions';
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

    // Multi-recipient state
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [additionalMessage, setAdditionalMessage] = useState('');
    const [selectedEffect, setSelectedEffect] = useState<EffectKey>('confetti');
    const [recentRecipients, setRecentRecipients] = useState<User[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Share modal state
    const [showShareModal, setShowShareModal] = useState(false);
    const [sentRecognitions, setSentRecognitions] = useState<Recognition[]>([]);

    useEffect(() => {
        if (currentUser?.id) {
            fetchRecentRecipients(currentUser.id).then(recipients => {
                const validRecipients = recipients.filter(r => r && r.id && r.name);
                setRecentRecipients(validRecipients);
            });
        }
    }, [currentUser?.id]);

    // Filter users - exclude current user and already selected users
    const availableUsers = users.filter(u => u.id !== currentUser?.id);

    const getMessage = useCallback(() => {
        const parts: string[] = [];
        if (selectedTemplate) parts.push(selectedTemplate);
        if (additionalMessage.trim()) parts.push(additionalMessage.trim());
        return parts.join(' ');
    }, [selectedTemplate, additionalMessage]);

    const canSend = selectedUserIds.length > 0;
    const hasContent = selectedTemplate || additionalMessage.trim();

    const handleAddUser = (userId: string) => {
        if (!userId) return;
        if (selectedUserIds.includes(userId)) return;
        if (selectedUserIds.length >= 5) {
            showToast('一度に送れるのは5人までです', 'error');
            return;
        }
        setSelectedUserIds([...selectedUserIds, userId]);
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    };

    const handleSend = async () => {
        // Validate current user
        if (!currentUser?.id) {
            showToast('ログインが必要です', 'error');
            openIdentityModal();
            return;
        }

        // Validate recipient
        if (selectedUserIds.length === 0) {
            showToast('宛先を選んでください', 'error');
            return;
        }

        // Show hint if no content
        if (!hasContent) {
            setShowHint(true);
            return;
        }

        setIsSending(true);

        try {
            const result = await createRecognitions(
                currentUser.id,
                selectedUserIds,
                getMessage(),
                selectedEffect
            );

            if (result.success > 0) {
                playEffect(selectedEffect);

                // Prepare data for share modal
                // Ideally createRecognitions returns the inserted objects with to_user_id
                // We need to map them to include user objects for display
                const enrichedRecognitions = result.recognitions.map(r => {
                    const toUser = users.find(u => u.id === r.to_user_id);
                    return {
                        ...r,
                        from_user: currentUser,
                        to_user: toUser,
                    };
                });

                setSentRecognitions(enrichedRecognitions);
                setShowShareModal(true);

                if (onSuccess && enrichedRecognitions.length > 0) {
                    onSuccess(enrichedRecognitions[0], enrichedRecognitions[0].to_user!);
                }

                // Reset form
                setSelectedUserIds([]);
                setSelectedTemplate(null);
                setAdditionalMessage('');
                setSelectedEffect('confetti');
                setShowHint(false);

                if (result.failed > 0) {
                    showToast(`${result.success}件送信、${result.failed}件失敗しました`, 'error');
                }
            } else {
                showToast('送信に失敗しました', 'error');
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
        setSentRecognitions([]);
    };

    // Helper to get user object
    const getUser = (id: string) => users.find(u => u.id === id);

    // Loading state
    if (isLoading) {
        return (
            <div className={`composer ${compact ? 'composer-compact' : ''}`}>
                <div className="composer-loading">読み込み中...</div>
            </div>
        );
    }

    return (
        <>
            <div className={`composer ${compact ? 'composer-compact' : ''}`}>
                <div className="composer-header">
                    <h3 className="composer-title">✨ 称賛を送る</h3>
                    <p className="composer-hint">テンプレ＋一言添えてみましょう</p>
                </div>

                {/* Recipient Selection */}
                <div className="composer-section">
                    <label className="composer-label">
                        宛先（複数可・5人まで）
                        <span className="composer-label-count">{selectedUserIds.length}/5</span>
                    </label>

                    {/* Selected Users Chips */}
                    {selectedUserIds.length > 0 && (
                        <div className="composer-selected-chips">
                            {selectedUserIds.map(id => {
                                const user = getUser(id);
                                if (!user) return null;
                                return (
                                    <div key={id} className="user-chip">
                                        <div className="avatar avatar-xs">{user.name.charAt(0)}</div>
                                        <span className="user-chip-name">{user.name}</span>
                                        <button
                                            className="user-chip-remove"
                                            onClick={() => handleRemoveUser(id)}
                                        >✕</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Native select dropdown for adding */}
                    <select
                        className="input composer-user-select-native"
                        value=""
                        onChange={e => handleAddUser(e.target.value)}
                        disabled={selectedUserIds.length >= 5}
                    >
                        <option value="">
                            {selectedUserIds.length >= 5
                                ? '宛先の上限に達しました'
                                : '宛先を追加...'}
                        </option>
                        {availableUsers.map(user => (
                            <option
                                key={user.id}
                                value={user.id}
                                disabled={selectedUserIds.includes(user.id)}
                            >
                                {user.name}{user.dept ? ` (${user.dept})` : ''}
                            </option>
                        ))}
                    </select>

                    {/* Recent Recipients - Quick add */}
                    {recentRecipients.length > 0 && (
                        <div className="composer-recent">
                            <span className="composer-recent-label">最近:</span>
                            {recentRecipients.map(user => (
                                <button
                                    key={user.id}
                                    type="button"
                                    className={`composer-recent-avatar ${selectedUserIds.includes(user.id) ? 'selected' : ''}`}
                                    onClick={() => handleAddUser(user.id)}
                                    title={user.name}
                                    disabled={selectedUserIds.includes(user.id)}
                                >
                                    <div className="avatar avatar-sm">{user.name.charAt(0)}</div>
                                </button>
                            ))}
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
                                type="button"
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
                    <div className="composer-label-row">
                        <label className="composer-label">文章入力（任意）</label>
                        <span className="composer-label-sub">具体的だと嬉しいですが、短くても大丈夫です</span>
                    </div>
                    <textarea
                        className="input composer-textarea"
                        placeholder="何が助かったかを一言でもOK（例：急ぎの対応ありがとう！）"
                        value={additionalMessage}
                        onChange={e => {
                            setAdditionalMessage(e.target.value);
                            setShowHint(false);
                        }}
                        rows={4}
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
                        type="button"
                        className="btn btn-primary composer-send"
                        disabled={!canSend || isSending}
                        onClick={handleSend}
                    >
                        {isSending ? '送信中...' : `称賛を送る${selectedUserIds.length > 1 ? ` (${selectedUserIds.length}人)` : ''}`}
                    </button>
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && sentRecognitions.length > 0 && (
                <ShareSuccessModal
                    recognitions={sentRecognitions}
                    onClose={handleCloseShareModal}
                />
            )}
        </>
    );
}
