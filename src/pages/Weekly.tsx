import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchWeeklyDigests } from '../lib/api/weekly';
import { fetchWeekBadges } from '../lib/api/badges';
import { EmptyState } from '../components/common/EmptyState';
import { formatWeekRange } from '../lib/utils/dates';
import type { WeeklyDigest, UserBadge } from '../lib/types';
import './Weekly.css';

export function Weekly() {
    const [digests, setDigests] = useState<WeeklyDigest[]>([]);
    const [badges, setBadges] = useState<Map<string, UserBadge[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            const fetchedDigests = await fetchWeeklyDigests();
            setDigests(fetchedDigests);

            // Fetch badges for each week
            const badgeMap = new Map<string, UserBadge[]>();
            for (const digest of fetchedDigests) {
                const weekBadges = await fetchWeekBadges(digest.week_start);
                badgeMap.set(digest.week_start, weekBadges);
            }
            setBadges(badgeMap);

            setIsLoading(false);
        }
        load();
    }, []);

    if (isLoading) {
        return (
            <div className="weekly-page">
                <div className="page-header">
                    <h1 className="page-title">📊 週次まとめ</h1>
                </div>
                <div className="weekly-skeleton">
                    {[1, 2].map(i => (
                        <div key={i} className="skeleton weekly-card-skeleton" />
                    ))}
                </div>
            </div>
        );
    }

    if (digests.length === 0) {
        return (
            <div className="weekly-page">
                <div className="page-header">
                    <h1 className="page-title">📊 週次まとめ</h1>
                </div>
                <EmptyState
                    icon="📊"
                    title="まだ週次まとめがありません"
                    description="Adminから週次まとめを生成してください。"
                    action={{ label: 'Adminへ', to: '/admin' }}
                />
            </div>
        );
    }

    return (
        <div className="weekly-page">
            <div className="page-header">
                <h1 className="page-title">📊 週次まとめ</h1>
                <p className="page-subtitle">チームの称賛ハイライト</p>
            </div>

            <div className="weekly-list">
                {digests.map(digest => {
                    const weekBadges = badges.get(digest.week_start) || [];
                    const stats = digest.stats_json;

                    return (
                        <div key={digest.id} className="weekly-card">
                            <div className="weekly-card-header">
                                <h2 className="weekly-card-title">
                                    {formatWeekRange(digest.week_start, digest.week_end)}
                                </h2>
                                <span className="weekly-card-total">
                                    {stats.total_recognitions} 件の称賛
                                </span>
                            </div>

                            <div className="weekly-card-body">
                                <div className="weekly-section">
                                    <h3 className="weekly-section-title">🏆 Top Receivers</h3>
                                    <div className="weekly-ranking">
                                        {stats.top_receivers.map((item, idx) => (
                                            <Link
                                                key={item.user_id}
                                                to={`/profile/${item.user_id}`}
                                                className="weekly-ranking-item"
                                            >
                                                <span className="weekly-ranking-medal">
                                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                                </span>
                                                <span className="weekly-ranking-name">{item.user_name}</span>
                                                <span className="weekly-ranking-count">{item.count}件</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                <div className="weekly-section">
                                    <h3 className="weekly-section-title">🎁 Top Givers</h3>
                                    <div className="weekly-ranking">
                                        {stats.top_givers.map((item, idx) => (
                                            <Link
                                                key={item.user_id}
                                                to={`/profile/${item.user_id}`}
                                                className="weekly-ranking-item"
                                            >
                                                <span className="weekly-ranking-medal">
                                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                                </span>
                                                <span className="weekly-ranking-name">{item.user_name}</span>
                                                <span className="weekly-ranking-count">{item.count}件</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {weekBadges.length > 0 && (
                                    <div className="weekly-section">
                                        <h3 className="weekly-section-title">🏅 今週の称号</h3>
                                        <div className="weekly-badges">
                                            {weekBadges.map(ub => (
                                                <div key={ub.id} className="weekly-badge">
                                                    <span className="weekly-badge-emoji">{ub.badge?.emoji}</span>
                                                    <div className="weekly-badge-info">
                                                        <span className="weekly-badge-label">{ub.badge?.label}</span>
                                                        <Link
                                                            to={`/profile/${ub.user_id}`}
                                                            className="weekly-badge-user"
                                                        >
                                                            {ub.user?.name}
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
