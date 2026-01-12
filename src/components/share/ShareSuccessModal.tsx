import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { PraiseShareCard } from './PraiseShareCard';
import { useToast } from '../../providers/ToastProvider';
import {
    generateShareText,
    shareToLine,
    copyToClipboard,
    downloadBlob,
    generateCardFilename,
    canShareFiles,
    shareFile,
    getImageShareFallbackText,
} from '../../lib/utils/share';
import type { Recognition, User } from '../../lib/types';
import './ShareSuccessModal.css';

interface ShareSuccessModalProps {
    recognition: Recognition;
    toUser: User;
    onClose: () => void;
}

type ModalState = 'initial' | 'generating' | 'card-ready';

export function ShareSuccessModal({ recognition, toUser, onClose }: ShareSuccessModalProps) {
    const { showToast } = useToast();
    const cardRef = useRef<HTMLDivElement>(null);

    const [state, setState] = useState<ModalState>('initial');
    const [cardBlob, setCardBlob] = useState<Blob | null>(null);
    const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);

    // Enrich recognition with user data for sharing
    const enrichedRecognition: Recognition = {
        ...recognition,
        to_user: toUser,
    };

    const handleLineTextShare = async () => {
        const text = generateShareText(enrichedRecognition);

        // Copy to clipboard first
        const copied = await copyToClipboard(text);
        if (copied) {
            showToast('テキストをコピーしました');
        }

        // Open LINE share
        shareToLine(text);
    };

    const handleGenerateCard = async () => {
        setState('generating');

        // Wait a bit for the card to render
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!cardRef.current) {
            showToast('カード生成に失敗しました', 'error');
            setState('initial');
            return;
        }

        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                backgroundColor: null,
                useCORS: true,
                logging: false,
            });

            canvas.toBlob((blob) => {
                if (blob) {
                    setCardBlob(blob);
                    setCardPreviewUrl(URL.createObjectURL(blob));
                    setState('card-ready');
                } else {
                    showToast('カード生成に失敗しました', 'error');
                    setState('initial');
                }
            }, 'image/png');
        } catch (err) {
            console.error('Card generation failed:', err);
            showToast('カード生成に失敗しました', 'error');
            setState('initial');
        }
    };

    const handleSaveCard = () => {
        if (!cardBlob) return;
        const filename = generateCardFilename(enrichedRecognition);
        downloadBlob(cardBlob, filename);
        showToast('カードを保存しました');
    };

    const handleLineCardShare = async () => {
        if (!cardBlob) return;

        // Try Web Share API first
        if (canShareFiles()) {
            const filename = generateCardFilename(enrichedRecognition);
            const shared = await shareFile(cardBlob, filename, generateShareText(enrichedRecognition));
            if (shared) {
                return;
            }
        }

        // Fallback: Save image and open LINE with instructions
        handleSaveCard();
        const fallbackText = getImageShareFallbackText();
        shareToLine(fallbackText);
    };

    const handleClose = () => {
        // Clean up preview URL
        if (cardPreviewUrl) {
            URL.revokeObjectURL(cardPreviewUrl);
        }
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal share-success-modal">
                <div className="modal-header">
                    <h2 className="share-success-title">🎉 送信しました！</h2>
                    <button className="btn btn-ghost share-close-btn" onClick={handleClose}>
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    {state === 'initial' && (
                        <>
                            <p className="share-success-desc">
                                {toUser.name}さんへの称賛がアプリに記録されました。
                                LINEでも共有しますか？
                            </p>

                            <div className="share-actions">
                                <button
                                    className="btn share-btn share-btn-line"
                                    onClick={handleLineTextShare}
                                >
                                    <span className="share-btn-icon">💬</span>
                                    LINEで送る（テキスト）
                                </button>

                                <button
                                    className="btn share-btn share-btn-card"
                                    onClick={handleGenerateCard}
                                >
                                    <span className="share-btn-icon">🎨</span>
                                    カードを作る
                                </button>
                            </div>

                            <button className="btn btn-ghost share-skip" onClick={handleClose}>
                                スキップ
                            </button>
                        </>
                    )}

                    {state === 'generating' && (
                        <div className="share-generating">
                            <div className="share-spinner"></div>
                            <p>カードを生成中...</p>
                        </div>
                    )}

                    {state === 'card-ready' && cardPreviewUrl && (
                        <>
                            <p className="share-card-desc">カードができました！</p>

                            <div className="share-card-preview">
                                <img src={cardPreviewUrl} alt="称賛カード" />
                            </div>

                            <div className="share-card-actions">
                                <button
                                    className="btn share-btn share-btn-save"
                                    onClick={handleSaveCard}
                                >
                                    <span className="share-btn-icon">💾</span>
                                    カードを保存（PNG）
                                </button>

                                <button
                                    className="btn share-btn share-btn-line"
                                    onClick={handleLineCardShare}
                                >
                                    <span className="share-btn-icon">💬</span>
                                    LINEで送る（カード）
                                </button>
                            </div>

                            <button className="btn btn-ghost share-skip" onClick={handleClose}>
                                閉じる
                            </button>
                        </>
                    )}
                </div>

                {/* Hidden card for generation */}
                <div className="share-card-hidden" aria-hidden="true">
                    <PraiseShareCard ref={cardRef} recognition={enrichedRecognition} />
                </div>
            </div>
        </div>
    );
}
