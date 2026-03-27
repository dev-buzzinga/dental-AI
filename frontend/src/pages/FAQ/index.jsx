import { useContext, useState } from 'react';
import "../../styles/faq.css"
import faqService from '../../service/faq';
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CommentIcon from '@mui/icons-material/Comment';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import CachedOutlinedIcon from '@mui/icons-material/CachedOutlined';

const fale_data = [
    {
        id: 1,
        question: "What is the purpose of this application?",
        answer: "This application is a tool for managing your FAQs.",
        status: "trained"
    },
    {
        id: 2,
        question: "How to add a new FAQ?",
        answer: "You can add a new FAQ by clicking the 'Add FAQ' button in the header.",
        link: null,
        status: "not_trained"
    },
    {
        id: 3,
        question: "How to edit a FAQ?",
        answer: "You can edit a FAQ by clicking the 'Edit' button in the FAQ list.",
        link: "https://www.google.com",
        status: "trained"
    }
]
const FAQPage = () => {
    const { user } = useContext(AuthContext);
    const showToast = useToast();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('qna');
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [link, setLink] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [faqs, setFaqs] = useState(fale_data);

    const resetForm = () => {
        setQuestion("");
        setAnswer("");
        setLink("");
    };

    const handleCloseSidebar = () => {
        setIsSidebarOpen(false);
        setActiveTab("qna");
        resetForm();
    };

    const handleAddFaq = async () => {
        if (!question.trim()) {
            showToast("Question is required", "error");
            return;
        }

        if (!answer.trim()) {
            showToast("Answer is required", "error");
            return;
        }

        if (!user?.id) {
            showToast("User is not authenticated", "error");
            return;
        }

        try {
            setIsSubmitting(true);
            await faqService.addFaq({
                user_id: user.id,
                question: question.trim(),
                answer: answer.trim(),
                link: link.trim() || null,
            });

            showToast("FAQ added successfully", "success");
            handleCloseSidebar();
        } catch (error) {
            console.error("Failed to add FAQ:", error);
            const message =
                error?.response?.data?.message || "Failed to add FAQ";
            showToast(message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefresh = async () => {
        const response = await faqService.searchFaqs({ query: "", user_id: user.id, match_count: 5 });
        setFaqs(response.data);
    };

    return (
        <div className="faq-page">
            <div className="faq-header">
                <div className="faq-header-left">
                    <h2 className="faq-title">FAQ</h2>
                </div>
                <div className="faq-header-actions-left">
                    <button className="btn-secondary" onClick={() => handleRefresh()}>
                        <CachedOutlinedIcon fontSize="small" />
                    </button>
                </div>
                <div className="faq-header-actions">
                    <button className="btn-primary" onClick={() => setIsSidebarOpen(true)}>
                        <i className="fas fa-plus" /> Add FAQ
                    </button>
                </div>
            </div>

            {/* write code for add new FQA UI */}
            <div className="faq-list">
                <div className="faq-list-header">
                    <h3 className="faq-list-title">Provide the content to the AI that you want to train its AI model on</h3>
                </div>
                {faqs.map((faq) => (
                    <div className="faq-card" key={faq.id}>
                        <div className="faq-card-content">
                            <div className="faq-card-question-row">
                                <ForumOutlinedIcon fontSize="medium" />
                                <h4 className="faq-card-question">{faq.question}</h4>
                            </div>
                            <p className="faq-card-answer">{faq.answer}
                                <div className="faq-card-link-row">
                                    {faq.link && (
                                        <a href={faq.link} target="_blank" rel="noopener noreferrer" className="faq-card-link-text">
                                            {faq.link}
                                        </a>
                                    )}
                                </div>
                            </p>
                        </div>
                        <div className="faq-card-actions">
                            <span className={`faq-status-badge ${faq.status === "trained" ? "faq-status-trained" : "faq-status-not-trained"}`}>
                                {faq.status == "trained" ? "Trained" : "Not Trained"}
                            </span>
                            <button type="button" className="faq-icon-btn" aria-label="Edit FAQ">
                                <i className="fas fa-pen" />
                            </button>
                            <button type="button" className="faq-icon-btn" aria-label="Delete FAQ">
                                <i className="fas fa-trash" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sidebar Drawer */}
            <div className={`faq-sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={handleCloseSidebar}>
                <div className="faq-sidebar" onClick={(e) => e.stopPropagation()}>
                    <div className="faq-sidebar-header">
                        <div className="faq-sidebar-title">Add New FAQ</div>
                        <button className="faq-sidebar-close" onClick={handleCloseSidebar}>
                            <i className="fas fa-times" />
                        </button>
                    </div>

                    <div className="faq-sidebar-body">
                        {/* Tabs */}
                        <div className="faq-tabs">
                            <button
                                type="button"
                                className={`faq-tab-btn ${activeTab === 'qna' ? 'active' : ''}`}
                                onClick={() => setActiveTab('qna')}
                            >
                                <ForumOutlinedIcon fontSize="small" /> Q & A
                            </button>
                            <button
                                type="button"
                                className={`faq-tab-btn ${activeTab === 'link' ? 'active' : ''}`}
                                onClick={() => setActiveTab('link')}
                            >
                                <i className="fas fa-link" /> Custom Links
                            </button>
                        </div>

                        {activeTab === 'qna' ? (
                            <div className="faq-qna-form fade-in">
                                <div className="faq-form-group">
                                    <label className="faq-label">Question</label>
                                    <div className="faq-input-wrapper">
                                        <ChatBubbleOutlineIcon fontSize="small" />
                                        <textarea
                                            placeholder="Add question text"
                                            rows={2}
                                            value={question}
                                            onChange={(e) => setQuestion(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="faq-form-group">
                                    <label className="faq-label">Answer</label>
                                    <div className="faq-input-wrapper">
                                        <CommentIcon fontSize="small" />
                                        <textarea
                                            placeholder="Add answer text"
                                            rows={4}
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="faq-link-form fade-in">
                                <div className="faq-form-group">
                                    <label className="faq-label">Custom Link</label>
                                    <div className="faq-input-wrapper">
                                        <i className="fas fa-link" />
                                        <input
                                            type="text"
                                            placeholder="Enter custom URL"
                                            value={link}
                                            onChange={(e) => setLink(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="faq-sidebar-footer">
                        <button className="btn-cancel" onClick={handleCloseSidebar}>CANCEL</button>
                        <button
                            className="btn-add-faq"
                            type="button"
                            onClick={handleAddFaq}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "ADDING..." : "ADD"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQPage;
