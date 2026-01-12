import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchHypeStats, getDailyTopic } from '../../lib/api/hype';
import { copyToClipboard } from '../../lib/utils/share';
import { useToast } from '../../providers/ToastProvider';
import './HypeSection.css';

interface HypeStats {
    todayCount: number;
    streakDays: number;
}

export function HypeSection() {
    const { showToast } = useToast();
    const [stats, setStats] = useState<HypeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [topic] = useState(getDailyTopic());

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fetchHypeStats();
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const handleCopyTopic = async () => {
        const text = `【今日のお題】${topic}：`; // Suffix colon for immediate typing
        const success = await copyToClipboard(text);
        if (success) {
            showToast('お題をコピーしました！');
        }
    };

    if (loading) {
        return <div className="hype-skeleton skeleton" />;
    }

    const { todayCount, streakDays } = stats || { todayCount: 0, streakDays: 0 };

    // Thermometer Logic
    const MAX_LEVEL = 6;
    const progress = Math.min(todayCount, MAX_LEVEL) / MAX_LEVEL * 100;

    let stageName = '';
    let stageIcon = '';
    let nextMessage = '';

    if (todayCount === 0) {
        stageName = 'しーん';
        stageIcon = '🫧';
        nextMessage = `あと${5 - todayCount}件で「最高の雰囲気」`; // 5? requirement says "0-4: あと{5-count}件で最高の雰囲気" ... wait.
        // Requirement: "0-4: あと{next_threshold - count}件で次へ" -> "次へ" usually means distinct stages?
        // But user specifically said: "count 0-4: あと{5-count}件で「最高の雰囲気」" in "追記" section.
        // "count 5: あと1件で「称賛デー」"
        // So 0-4 all aim for 5 ("Highest Atmosphere")?
        // Let's follow requirement: "0-4: あと{5-count}件で「最高の雰囲気」"
    } else if (todayCount === 1) {
        stageName = 'ぬくもり';
        stageIcon = '☁️';
    } else if (todayCount === 2) {
        stageName = 'あったかい';
        stageIcon = '🌤️';
    } else if (todayCount === 3) {
        stageName = '熱い';
        stageIcon = '🔥';
    } else if (todayCount === 4) {
        stageName = '祭り';
        stageIcon = '🎉';
    } else if (todayCount === 5) {
        stageName = '最高の雰囲気';
        stageIcon = '✨';
        nextMessage = 'あと1件で「称賛デー」';
    } else {
        stageName = '称賛デー';
        stageIcon = '🏁';
        nextMessage = '称賛デー！（いい感じです）';
    }

    if (todayCount >= 0 && todayCount <= 4) {
        nextMessage = `あと${5 - todayCount}件で「最高の雰囲気」`;
    }

    // Streak Logic
    // "今日が0件なら streak_days = 0 とし、責めない文言で表示"
    // "今日はまだ0件（最初の1件で復活）"
    const streakText = streakDays > 0
        ? `${streakDays}日連続！`
        : `今日はまだ0件（最初の1件で復活）`;

    return (
        <div className="hype-section">
            {/* 1. Thermometer */}
            <div className="hype-card hype-thermometer">
                <div className="hype-header">
                    <span className="hype-icon">{stageIcon}</span>
                    <div className="hype-info">
                        <div className="hype-title">今日の称賛: <span className="hype-highlight">{todayCount}件</span></div>
                        <div className="hype-subtitle">状態: {stageName}</div>
                    </div>
                </div>
                <div className="hype-progress-bg">
                    <div
                        className="hype-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="hype-next">{nextMessage}</div>
            </div>

            {/* 2. Streak */}
            <div className="hype-card hype-streak">
                <div className="hype-label">チーム連続記録</div>
                <div className="hype-value">
                    {streakDays > 0 ? '🔥 ' : '💤 '}
                    {streakText}
                </div>
            </div>

            {/* 3. Daily Topic */}
            <div className="hype-card hype-topic">
                <div className="hype-topic-label">今日の1行お題</div>
                <div className="hype-topic-content">{topic}</div>
                <div className="hype-topic-hint">一言でもOK</div>
                <div className="hype-actions">
                    <button onClick={handleCopyTopic} className="btn btn-sm btn-secondary">
                        お題をコピー
                    </button>
                    <Link to="/send" className="btn btn-sm btn-ghost">
                        Sendへ
                    </Link>
                </div>
            </div>
        </div>
    );
}
