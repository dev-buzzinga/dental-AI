import { useContext, useState } from 'react';
import "../../styles/faq.css"
import faqService from '../../service/faq';
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CommentIcon from '@mui/icons-material/Comment';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
const FAQPage = () => {
    const { user } = useContext(AuthContext);
    const showToast = useToast();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('qna');
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [link, setLink] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    return (
        <div className="faq-page">
            <div className="faq-header">
                <div className="faq-header-left">
                    <h2 className="faq-title">FAQ</h2>
                </div>
                <div className="faq-header-actions">
                    <button className="btn-primary" onClick={() => setIsSidebarOpen(true)}>
                        <i className="fas fa-plus" /> Add FAQ
                    </button>
                </div>
            </div>

            {/* write code for add new FQA UI */}

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
