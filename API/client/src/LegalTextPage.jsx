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
                        setError('Invalid legal document type.');
                        setLoading(false);
                        return;
                }
                setTitle(pageTitle);
                const res = await api.get(`/legal/${endpointType}`);
                setContent(res.data);
            } catch (err) {
                console.error(`Failed to fetch ${type} content:`, err);
                setError('Failed to load content. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [type]);

    if (loading) {
        return <div className="container" style={{textAlign: 'center', padding: '2rem'}}>Loading...</div>;
    }

    if (error) {
        return <div className="container" style={{textAlign: 'center', padding: '2rem', color: 'var(--danger)'}}>{error}</div>;
    }

    return (
        <div className="container" style={{paddingBottom: '4rem'}}>
            <h1 style={{marginBottom: '2rem'}}>{title}</h1>
            <pre style={{whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'inherit', fontSize: '1rem', lineHeight: '1.6'}}>
                {content}
            </pre>
        </div>
    );
}