import { supabase } from '../supabase';

// Topics list
const DAILY_TOPICS = [
    '最近「助かる〜」と思ったことは？',
    '影で支えてくれている人は誰？',
    '今週、笑顔が素敵だった人は？',
    '素早いレスで助けてくれた人は？',
    '会議でナイスな発言をした人は？',
    '困っている時に声をかけてくれた人は？',
    '細かい気配りをしてくれた人は？',
    '技術的な質問に答えてくれた人は？',
    '新しい知識をシェアしてくれた人は？',
    'ムードメーカーだと思う人は？',
    '丁寧なドキュメントを書いてくれた人は？',
    'バグ修正・障害対応を頑張っていた人は？',
    'ランチや休憩で和ませてくれた人は？',
    '期待以上の成果を出していた人は？',
    '最近チャットでの反応が早い人は？',
    '地味だけど重要な仕事をしてくれた人は？',
    '新しい提案をしてくれた人は？',
    '周りをやる気にさせてくれる人は？',
    '整理整頓や掃除をしてくれた人は？',
    'いつも挨拶が気持ちいい人は？'
];

/**
 * Get daily topic deterministically based on date (JST)
 */
export function getDailyTopic(): string {
    const now = new Date();
    // Use JST date string for deterministic selection
    const jstDate = now.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });

    // Simple hash of the date string
    let hash = 0;
    for (let i = 0; i < jstDate.length; i++) {
        hash = ((hash << 5) - hash) + jstDate.charCodeAt(i);
        hash |= 0;
    }

    const index = Math.abs(hash) % DAILY_TOPICS.length;
    return DAILY_TOPICS[index];
}

/**
 * Fetch today's recognition count and stats
 */
export async function fetchHypeStats() {
    // Calculate Today JST range in UTC
    const now = new Date();

    // Create Date object for Today 00:00 JST
    // We treat "Today" as defined by JST
    const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const jstStart = new Date(jstNow);
    jstStart.setHours(0, 0, 0, 0);

    const jstEnd = new Date(jstStart);
    jstEnd.setDate(jstEnd.getDate() + 1);

    // To query database (which stores UTC), we need to correct the offset
    // JST is UTC+9. So 00:00 JST is Previous Day 15:00 UTC.
    // However, simplest way is to fetch recent data and filter in JS, 
    // or use exact ISO strings if we trust the conversion.
    // Let's use JS ISO string logic manually.

    const startIso = new Date(jstStart.getTime() - 9 * 60 * 60 * 1000).toISOString();
    const endIso = new Date(jstEnd.getTime() - 9 * 60 * 60 * 1000).toISOString();

    // 1. Get Today's count
    const { count: todayCount, error: todayError } = await supabase
        .from('recognitions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lt('created_at', endIso);

    if (todayError) {
        console.error('Error fetching today stats:', todayError);
        return { todayCount: 0, streakDays: 0 };
    }

    // 2. Calculate Streak
    // We need to fetch dates of past recognitions to calculate streak
    // Fetch distinct created_at dates (truncated to day)
    // Supabase doesn't easily support "distinct date(created_at)" without RPC.
    // So we fetch metadata (created_at only) for last ~60 days.

    const streakLookback = new Date();
    streakLookback.setDate(streakLookback.getDate() - 60);

    const { data: history, error: historyError } = await supabase
        .from('recognitions')
        .select('created_at')
        .gte('created_at', streakLookback.toISOString())
        .order('created_at', { ascending: false });

    if (historyError) {
        console.error('Error fetching streak history:', historyError);
        return { todayCount: todayCount || 0, streakDays: 0 };
    }

    // Process unique dates in JST
    const activeDays = new Set<string>();
    history?.forEach(r => {
        const d = new Date(r.created_at);
        const jstDateStr = d.toLocaleDateString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '-'); // YYYY-MM-DD
        activeDays.add(jstDateStr);
    });

    // Calculate streak from Today backwards
    // Current requirement: If today has 0, streak = 0.
    // If today > 0, check yesterday, etc.

    const todayJstStr = jstNow.toLocaleDateString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-');

    if (!activeDays.has(todayJstStr)) {
        return { todayCount: todayCount || 0, streakDays: 0 };
    }

    let streak = 0;
    let checkDate = new Date(jstStart); // Start checking from Today

    while (true) {
        const dateStr = checkDate.toLocaleDateString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '-');

        if (activeDays.has(dateStr)) {
            streak++;
            // Go to previous day
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return {
        todayCount: todayCount || 0,
        streakDays: streak
    };
}
