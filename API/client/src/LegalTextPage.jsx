import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from './api';

export default function LegalTextPage() {
    const { type } = useParams();
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            setError(null);
            try {
                let endpointType = '';
                let pageTitle = '';
                switch (type) {
                    case 'impressum':
                        endpointType = 'impressum';
                        pageTitle = 'Impressum';
                        break;
                    case 'privacy-policy':
                        endpointType = 'privacy';
                        pageTitle = 'Privacy Policy';
                        break;
                    case 'terms-of-service':
                        endpointType = 'terms';
                        pageTitle = 'Terms of Service';
                        break;
                    default:
                        setError('INVALID DOCUMENT TYPE');
                        setLoading(false);
                        return;
                }
                setTitle(pageTitle);
                const res = await api.get(`/legal/${endpointType}`);
                setContent(res.data);
            } catch (err) {
                console.error(`Failed to fetch ${type} content:`, err);
                setError('COULD NOT LOAD CONTENT');
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [type]);

    if (loading) {
        return <div className="container" style={{padding: '4rem 0'}}>LOADING...</div>;
    }

    if (error) {
        return (
            <div className="container" style={{padding: '4rem 0'}}>
                <h3 style={{ borderBottom: 'none' }}>ERROR</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="container" style={{paddingBottom: '4rem'}}>
            <h1 style={{ marginBottom: '3rem' }}>{title}</h1>
            <div style={{ 
                whiteSpace: 'pre-wrap', 
                wordWrap: 'break-word', 
                fontSize: '0.9rem', 
                lineHeight: '1.8',
                maxWidth: '800px' 
            }}>
                {content}
            </div>
        </div>
    );
}
