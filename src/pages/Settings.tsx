import { useCurrentUser } from '../providers/CurrentUserProvider';
import './Settings.css';

export function Settings() {
    const { currentUser, openIdentityModal } = useCurrentUser();

    return (
        <div className="settings-page">
            <div className="page-header">
                <h1 className="page-title">⚙️ 設定</h1>
            </div>

            <div className="settings-section">
                <h2 className="settings-section-title">ユーザー設定</h2>

                <div className="settings-card">
                    <div className="settings-item">
                        <div className="settings-item-label">現在のユーザー</div>
                        <div className="settings-item-value">
                            <div className="avatar">{currentUser?.name.charAt(0)}</div>
                            <div className="settings-user-info">
                                <span className="settings-user-name">{currentUser?.name}</span>
                                {currentUser?.dept && (
                                    <span className="settings-user-dept">{currentUser.dept}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="settings-item">
                        <div className="settings-item-label">ユーザーを変更</div>
                        <button className="btn btn-secondary" onClick={openIdentityModal}>
                            別のユーザーに切り替え
                        </button>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2 className="settings-section-title">アプリについて</h2>

                <div className="settings-card">
                    <div className="settings-item">
                        <div className="settings-item-label">バージョン</div>
                        <div className="settings-item-value">1.0.0 (MVP)</div>
                    </div>
                    <div className="settings-item">
                        <div className="settings-item-label">説明</div>
                        <div className="settings-item-value">
                            社内向け Peer Praise（称賛）アプリケーション
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
