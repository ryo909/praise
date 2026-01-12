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
    const { currentUser, users } = useCurrentUser();
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
        if (currentUser) {
            fetchRecentRecipients(currentUser.id).then(setRecentRecipients);
        }
    }, [currentUser]);

    const filteredUsers = users.filter(u => {
        if (u.id === currentUser?.id) return false;
        if (!userSearchQuery.trim()) return true;
        return u.name.toLowerCase().includes(userSearchQuery.toLowerCase());
    });

    const getMessage = useCallback(() => {
        const parts: string[] = [];
        if (selectedTemplate) parts.push(selectedTemplate);
        if (additionalMessage.trim()) parts.push(additionalMessage.trim());
        return parts.join(' ');
    }, [selectedTemplate, additionalMessage]);

    const canSend = selectedUser !== null;
    const hasContent = selectedTemplate || additionalMessage.trim();

    const handleSend = async () => {
        if (!currentUser || !selectedUser) return;

        // Show hint if no content
        if (!hasContent) {
            setShowHint(true);
            return;
        }

        setIsSending(true);
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
                showToast('送信に失敗しました', 'error');
            }
        } catch {
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
                                    onClick={() => setSelectedUser(user)}
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
