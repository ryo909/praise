import { Link } from 'react-router-dom';
import { QuickPraiseComposer } from '../components/praise/QuickPraiseComposer';
import { useToast } from '../providers/ToastProvider';
import { useNavigate } from 'react-router-dom';
import './Send.css';

export function Send() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleSuccess = () => {
        showToast('称賛を送りました！');
        // Navigate to feed after a brief delay
        setTimeout(() => {
            navigate('/feed');
        }, 1500);
    };

    return (
        <div className="send-page">
            <div className="page-header">
                <h1 className="page-title">✨ 称賛を送る（15秒）</h1>
                <p className="page-subtitle">テンプレを押すだけでも送れます</p>
            </div>

            <div className="send-composer-wrapper">
                <QuickPraiseComposer onSuccess={handleSuccess} />
            </div>

            <div className="send-tips">
                <h3 className="send-tips-title">💡 ヒント</h3>
                <ul className="send-tips-list">
                    <li>宛先を選んでテンプレートをクリックするだけでOK</li>
                    <li>追記でより詳しいメッセージを添えることもできます</li>
                    <li>送った称賛は<Link to="/feed">フィード</Link>に表示されます</li>
                </ul>
            </div>
        </div>
    );
}
