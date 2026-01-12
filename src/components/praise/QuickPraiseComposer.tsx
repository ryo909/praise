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

    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [additionalMessage, setAdditionalMessage] = useState('');
    const [selectedEffect, setSelectedEffect] = useState<EffectKey>('confetti');
    const [recentRecipients, setRecentRecipients] = useState<User[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Share modal state
    const [showShareModal, setShowShareModal] = useState(false);
    const [sentRecognition, setSentRecognition] = useState<Recognition | null>(null);
    const [sentToUser, setSentToUser] = useState<User | null>(null);

    useEffect(() => {
        if (currentUser?.id) {
            fetchRecentRecipients(currentUser.id).then(recipients => {
                const validRecipients = recipients.filter(r => r && r.id && r.name);
                setRecentRecipients(validRecipients);
            });
        }
    }, [currentUser?.id]);

    // Filter users - exclude current user
    const availableUsers = users.filter(u => u.id !== currentUser?.id);

    // Get selected user object from ID
    const selectedUser = availableUsers.find(u => u.id === selectedUserId) || null;

    const getMessage = useCallback(() => {
        const parts: string[] = [];
        if (selectedTemplate) parts.push(selectedTemplate);
        if (additionalMessage.trim()) parts.push(additionalMessage.trim());
        return parts.join(' ');
    }, [selectedTemplate, additionalMessage]);

    const canSend = selectedUserId !== '';
    const hasContent = selectedTemplate || additionalMessage.trim();

    const handleUserChange = (userId: string) => {
        console.log('handleUserChange:', userId);
        setSelectedUserId(userId);
    };

    const handleSend = async () => {
        // Validate current user
        if (!currentUser?.id) {
            showToast('ログインが必要です', 'error');
            openIdentityModal();
            return;
        }

        // Validate recipient
        if (!selectedUserId) {
            showToast('宛先を選んでください', 'error');
            return;
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(selectedUserId)) {
            console.error('Invalid selectedUserId:', selectedUserId);
            showToast('宛先が不正です', 'error');
            return;
        }

        // Show hint if no content
        if (!hasContent) {
            setShowHint(true);
            return;
        }

        setIsSending(true);

        console.log('Sending recognition:', {
            from: currentUser.id,
            to: selectedUserId,
            toName: selectedUser?.name,
            message: getMessage(),
            effect: selectedEffect,
        });

        try {
            const recognition = await createRecognition(
                currentUser.id,
                selectedUserId,
                getMessage(),
                selectedEffect
            );

            if (recognition) {
                playEffect(selectedEffect);

                const enrichedRecognition: Recognition = {
                    ...recognition,
                    from_user: currentUser,
                    to_user: selectedUser || undefined,
                };
                setSentRecognition(enrichedRecognition);
                setSentToUser(selectedUser);
                setShowShareModal(true);

                if (onSuccess && selectedUser) {
                    onSuccess(recognition, selectedUser);
                }

                // Reset form
                setSelectedUserId('');
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

                {/* Recipient Selection - Native Select for reliability */}
                <div className="composer-section">
                    <label className="composer-label">宛先</label>

                    {/* Recent Recipients - Quick select */}
                    {recentRecipients.length > 0 && !selectedUserId && (
                        <div className="composer-recent">
                            <span className="composer-recent-label">最近:</span>
                            {recentRecipients.map(user => (
                                <button
                                    key={user.id}
                                    type="button"
                                    className="composer-recent-avatar"
                                    onClick={() => handleUserChange(user.id)}
                                    title={user.name}
                                >
                                    <div className="avatar avatar-sm">{user.name.charAt(0)}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Native select dropdown */}
                    <select
                        className="input composer-user-select-native"
                        value={selectedUserId}
                        onChange={e => handleUserChange(e.target.value)}
                    >
                        <option value="">宛先を選択...</option>
                        {availableUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.name}{user.dept ? ` (${user.dept})` : ''}
                            </option>
                        ))}
                    </select>
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
                        type="button"
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
