import { Link } from 'react-router-dom';
import { useCurrentUser } from '../providers/CurrentUserProvider';
import { RightRail, WidgetCard } from '../components/shell/RightRail';
import './Home.css';

export function Home() {
    const { currentUser } = useCurrentUser();

    return (
        <div className="page-layout">
            <div className="page-content">
                <div className="home-hero">
                    <h1 className="home-title">
                        おかえりなさい、
                        <span className="home-user-name">{currentUser?.name}</span>さん 👋
                    </h1>
                    <p className="home-subtitle">
                        今日も仲間に感謝を伝えましょう
                    </p>
                </div>

                <div className="home-actions">
                    <Link to="/send" className="home-action-card home-action-primary">
                        <span className="home-action-icon">✨</span>
                        <div className="home-action-content">
                            <h3 className="home-action-title">称賛を送る</h3>
                            <p className="home-action-desc">テンプレを押すだけ、15秒で完了</p>
                        </div>
                    </Link>

                    <Link to="/feed" className="home-action-card">
                        <span className="home-action-icon">📰</span>
                        <div className="home-action-content">
                            <h3 className="home-action-title">フィードを見る</h3>
                            <p className="home-action-desc">みんなの称賛をチェック</p>
                        </div>
                    </Link>

                    <Link to="/weekly" className="home-action-card">
                        <span className="home-action-icon">📊</span>
                        <div className="home-action-content">
                            <h3 className="home-action-title">週次まとめ</h3>
                            <p className="home-action-desc">今週のハイライト</p>
                        </div>
                    </Link>

                    <Link to={`/profile/${currentUser?.id}`} className="home-action-card">
                        <span className="home-action-icon">👤</span>
                        <div className="home-action-content">
                            <h3 className="home-action-title">マイプロフィール</h3>
                            <p className="home-action-desc">受け取った称賛と称号</p>
                        </div>
                    </Link>
                </div>
            </div>

            <RightRail>
                <WidgetCard title="クイックスタート" icon="🚀">
                    <div className="widget-list">
                        <p className="widget-tip">
                            テンプレートを使えば、<strong>15秒</strong>で称賛を送れます。
                        </p>
                        <Link to="/send" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                            今すぐ送る
                        </Link>
                    </div>
                </WidgetCard>
            </RightRail>
        </div>
    );
}
