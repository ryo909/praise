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
    // JSTの年月日を作る（JST=UTC+9前提で「JSTの今日」を取る）
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getUTCFullYear();
    const m = jst.getUTCMonth();
    const d = jst.getUTCDate();
    // 「JSTの00:00」をUTCで表現するには、UTCの前日15:00相当になるので -9h する
    const startUtc = new Date(Date.UTC(y, m, d, -9, 0, 0));     // JST 00:00
    const endUtc = new Date(Date.UTC(y, m, d + 1, -9, 0, 0));  // JST 翌日00:00
    const startIso = startUtc.toISOString();
    const endIso = endUtc.toISOString();

    console.log('[DEBUG] fetchHypeStats', { startIso, endIso, jstTime: jst.toISOString() });

    // 1. Get Today's count
    const { count, error } = await supabase
        .from('recognitions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lt('created_at', endIso);

    console.log('[DEBUG] Supabase result', { count, error });

    if (error) {
        console.error('Error fetching today stats:', error);
        return { todayCount: 0, streakDays: 0 };
    }

    const todayCountVal = count ?? 0;

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
        return { todayCount: todayCountVal, streakDays: 0 };
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
    // Note: The requirement says:
    // "今日が0件なら streak_days = 0 とし、責めない文言で表示" -> HypeSection handles the text.
    // Here we just return the calculated streak.

    /**
     * Streak calculation logic:
     * - If today has count, today is part of streak? Usually yes.
     * - If today has 0 count, streak is 0? Or streak is previous streak?
     *   "今日が0件なら streak_days = 0 とし..." => If count is 0, streak is 0.
     *   But "今日はまだ0件（最初の1件で復活）" implies we might want to know the *potential* streak?
     *   However, strictly following: "今日が0件なら streak_days = 0"
     */

    // We need "todayStr" for the check
    const todayJstStr = startUtc.toLocaleDateString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-');

    if (todayCountVal === 0) {
        // As per requirement "Today 0 count => streak 0" (likely for display purposes)
        // Although usually streak is "consecutive days up to yesterday + today if done".
        // The user prompts implies: "recognitions には実際にレコードが増えているのに反映されない"
        // So they want to fix the count.
        // Regarding streak: I will keep existing logic behavior roughly, but corrected.
        // Current code had: if (!activeDays.has(todayJstStr)) return ...
        // Since we have exact count, let's use it.
        return { todayCount: todayCountVal, streakDays: 0 };
    }

    let streak = 0;
    let checkDate = new Date(startUtc); // Start checking from Today (JST 00:00)

    while (true) {
        const dateStr = checkDate.toLocaleDateString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '-');

        // We know today has count because of the check above.
        // But let's check activeDays for consistency if history includes today.
        // Actually history query might include today.
        // Ideally we just trust `todayCountVal`.

        let hasActivity = false;
        if (dateStr === todayJstStr) {
            hasActivity = todayCountVal > 0;
        } else {
            hasActivity = activeDays.has(dateStr);
        }

        if (hasActivity) {
            streak++;
            // Go to previous day
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return {
        todayCount: todayCountVal,
        streakDays: streak
    };
}
