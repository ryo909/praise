import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '../providers/CurrentUserProvider';
import { fetchRecognitionsWithDetails } from '../lib/api/recognitions';
import { QuickPraiseComposer } from '../components/praise/QuickPraiseComposer';
import { PraiseCard } from '../components/praise/PraiseCard';
import { NewItemsBanner } from '../components/praise/NewItemsBanner';
import { EmptyState } from '../components/common/EmptyState';
import { RightRail, WidgetCard } from '../components/shell/RightRail';
import type { Recognition, FeedFilters } from '../lib/types';
import './Feed.css';

const POLLING_INTERVAL = 20000; // 20 seconds

export function Feed() {
    const { currentUser, users } = useCurrentUser();
    const [searchParams, setSearchParams] = useSearchParams();

    const [recognitions, setRecognitions] = useState<Recognition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newItems, setNewItems] = useState<Recognition[]>([]);
    const [isNearTop, setIsNearTop] = useState(true);

    const feedTopRef = useRef<HTMLDivElement>(null);
    const latestIdRef = useRef<string | null>(null);

    // Parse filters from URL
    const filters: FeedFilters = {
        period: (searchParams.get('period') as FeedFilters['period']) || 'all',
        personMode: (searchParams.get('personMode') as FeedFilters['personMode']) || 'any',
        personId: searchParams.get('personId') || undefined,
        query: searchParams.get('query') || undefined,
    };

    const selectedPerson = filters.personId
        ? users.find(u => u.id === filters.personId)
        : null;

    // Fetch recognitions
    const loadRecognitions = useCallback(async (isPolling = false) => {
        if (!currentUser) return;

        if (!isPolling) setIsLoading(true);

        const data = await fetchRecognitionsWithDetails(filters, currentUser.id);

        if (isPolling && latestIdRef.current) {
            // Find new items
            const latestIdx = data.findIndex(r => r.id === latestIdRef.current);
            if (latestIdx > 0) {
                const newOnes = data.slice(0, latestIdx);
                if (isNearTop) {
                    // Auto-insert if near top
                    setRecognitions(data);
                    latestIdRef.current = data[0]?.id || null;
                } else {
                    // Buffer new items
                    setNewItems(prev => [...newOnes, ...prev]);
                }
            }
        } else {
            setRecognitions(data);
            latestIdRef.current = data[0]?.id || null;
        }

        setIsLoading(false);
    }, [currentUser, filters, isNearTop]);

    // Initial load
    useEffect(() => {
        loadRecognitions();
    }, [filters.period, filters.personMode, filters.personId, filters.query, currentUser?.id]);

    // Polling
    useEffect(() => {
        const interval = setInterval(() => {
            loadRecognitions(true);
        }, POLLING_INTERVAL);

        return () => clearInterval(interval);
    }, [loadRecognitions]);

    // Intersection Observer for near-top detection
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsNearTop(entry.isIntersecting);
            },
            { threshold: 0, rootMargin: '100px' }
        );

        if (feedTopRef.current) {
            observer.observe(feedTopRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Handle new items click
    const handleShowNewItems = () => {
        setRecognitions(prev => {
            const combined = [...newItems, ...prev];
            // Dedupe by id
            const seen = new Set<string>();
            return combined.filter(r => {
                if (seen.has(r.id)) return false;
                seen.add(r.id);
                return true;
            });
        });
        latestIdRef.current = newItems[0]?.id || latestIdRef.current;
        setNewItems([]);
        feedTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle send success
    const handleSendSuccess = (recognition: Recognition, toUser: typeof users[0]) => {
        const enrichedRecognition: Recognition = {
            ...recognition,
            from_user: currentUser!,
            to_user: toUser,
            reactions: [],
            clap_count: 0,
            user_has_clapped: false,
        };
        setRecognitions(prev => [enrichedRecognition, ...prev]);
        latestIdRef.current = recognition.id;
    };

    // Handle clap toggle
    const handleClapToggle = (recognitionId: string, hasClapped: boolean) => {
        setRecognitions(prev => prev.map(r => {
            if (r.id !== recognitionId) return r;
            return {
                ...r,
                user_has_clapped: hasClapped,
                clap_count: hasClapped
                    ? (r.clap_count || 0) + 1
                    : Math.max(0, (r.clap_count || 0) - 1),
            };
        }));
    };

    // Filter change handlers
    const handlePeriodChange = (period: FeedFilters['period']) => {
        const params = new URLSearchParams(searchParams);
        params.set('period', period);
        setSearchParams(params);
    };

    const handleClearFilters = () => {
        setSearchParams({});
    };

    const hasFilters = filters.period !== 'all' || filters.personId || filters.query;

    return (
        <div className="page-layout">
            <div className="page-content">
                <div ref={feedTopRef} className="feed-top-anchor" />

                <QuickPraiseComposer onSuccess={handleSendSuccess} compact />

                <div className="feed-filters">
                    <div className="feed-filter-group">
                        <button
                            className={`chip ${filters.period === 'week' ? 'active' : ''}`}
                            onClick={() => handlePeriodChange('week')}
                        >
                            今週
                        </button>
                        <button
                            className={`chip ${filters.period === 'month' ? 'active' : ''}`}
                            onClick={() => handlePeriodChange('month')}
                        >
                            今月
                        </button>
                        <button
                            className={`chip ${filters.period === 'all' ? 'active' : ''}`}
                            onClick={() => handlePeriodChange('all')}
                        >
                            全期間
                        </button>
                    </div>

                    {hasFilters && (
                        <div className="feed-active-filters">
                            {selectedPerson && (
                                <span className="chip active">
                                    {selectedPerson.name}
                                    {filters.personMode === 'from' && ' が送信'}
                                    {filters.personMode === 'to' && ' が受信'}
                                </span>
                            )}
                            {filters.query && (
                                <span className="chip active">"{filters.query}"</span>
                            )}
                            <button className="btn btn-ghost feed-clear-filters" onClick={handleClearFilters}>
                                クリア
                            </button>
                        </div>
                    )}
                </div>

                <NewItemsBanner count={newItems.length} onClick={handleShowNewItems} />

                {isLoading ? (
                    <div className="feed-skeleton">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton praise-card-skeleton" />
                        ))}
                    </div>
                ) : recognitions.length === 0 ? (
                    <EmptyState
                        icon="📭"
                        title="まだ称賛がありません"
                        description="まずはテンプレを押すだけでOK。"
                        action={{ label: '称賛を送る', to: '/send' }}
                    />
                ) : (
                    <div className="feed-list">
                        {recognitions.map(recognition => (
                            <PraiseCard
                                key={recognition.id}
                                recognition={recognition}
                                currentUserId={currentUser?.id || ''}
                                onClapToggle={handleClapToggle}
                            />
                        ))}
                    </div>
                )}
            </div>

            <RightRail>
                <WidgetCard title="今週のサマリ" icon="📊">
                    <div className="widget-stats-grid">
                        <div className="widget-stat">
                            <div className="widget-stat-value">{recognitions.length}</div>
                            <div className="widget-stat-label">全社</div>
                        </div>
                        <div className="widget-stat">
                            <div className="widget-stat-value">
                                {recognitions.filter(r => r.from_user_id === currentUser?.id).length}
                            </div>
                            <div className="widget-stat-label">送った</div>
                        </div>
                        <div className="widget-stat">
                            <div className="widget-stat-value">
                                {recognitions.filter(r => r.to_user_id === currentUser?.id).length}
                            </div>
                            <div className="widget-stat-label">もらった</div>
                        </div>
                    </div>
                </WidgetCard>
            </RightRail>
        </div>
    );
}
