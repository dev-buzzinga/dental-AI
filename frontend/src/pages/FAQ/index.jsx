import { useContext, useEffect, useState } from 'react';
import "../../styles/faq.css"
import faqService from '../../service/faq';
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CommentIcon from '@mui/icons-material/Comment';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import CachedOutlinedIcon from '@mui/icons-material/CachedOutlined';
import LinkIcon from '@mui/icons-material/Link';

const FAQPage = () => {
    const { user } = useContext(AuthContext);
    const showToast = useToast();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedFaqId, setSelectedFaqId] = useState(null);
    const [activeTab, setActiveTab] = useState('qna');
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [link, setLink] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [faqs, setFaqs] = useState([]);

    const resetForm = () => {
        setQuestion("");
        setAnswer("");
        setLink("");
    };

    const handleCloseSidebar = () => {
        setIsSidebarOpen(false);
        setIsEditMode(false);
        setSelectedFaqId(null);
        setActiveTab("qna");
        resetForm();
    };

    const loadFaqs = async () => {
        if (!user?.id) {
            return;
        }

        try {
            setIsLoading(true);
            const response = await faqService.getAllFaqs();
            setFaqs(response?.data || []);
        } catch (error) {
            const message = error?.response?.data?.message || "Failed to load FAQs";
            showToast(message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFaqs();
    }, [user?.id]);

    const handleSubmitFaq = async () => {
        if (activeTab === "qna" && (!question.trim() || !answer.trim())) {
            showToast("Question and answer are required", "error");
            return;
        }

        if (activeTab === "link" && !link.trim()) {
            showToast("Link is required", "error");
            return;
        }

        try {
            setIsSubmitting(true);
            if (isEditMode) {
                const payload = { faq_id: selectedFaqId };
                if (activeTab === "link") {
                    payload.link = link.trim();
                } else {
                    payload.question = question.trim();
                    payload.answer = answer.trim();
                }
                await faqService.updateFaq(payload);
                showToast("FAQ updated successfully", "success");
            } else {
                const payload = {};
                if (activeTab === "link") {
                    payload.link = link.trim();
                } else {
                    payload.question = question.trim();
                    payload.answer = answer.trim();
                }
                await faqService.addFaq(payload);
                showToast("FAQ added successfully", "success");
            }

            handleCloseSidebar();
            await loadFaqs();
        } catch (error) {
            console.error("Failed to submit FAQ:", error);
            const message = error?.response?.data?.message || "Failed to save FAQ";
            showToast(message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditFaq = async (faqId) => {
        try {
            setIsSubmitting(true);
            const response = await faqService.getOneFaq(faqId);
            const faq = response?.data;
            if (!faq) {
                showToast("FAQ not found", "error");
                return;
            }

            setIsEditMode(true);
            setSelectedFaqId(faq.id);
            setQuestion(faq.question || "");
            setAnswer(faq.answer || "");
            setLink(faq.link || "");
            setActiveTab(faq.link ? "link" : "qna");
            setIsSidebarOpen(true);
        } catch (error) {
            const message = error?.response?.data?.message || "Failed to fetch FAQ details";
            showToast(message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteFaq = async (faqId) => {
        const isConfirmed = window.confirm("Are you sure you want to delete this FAQ?");
        if (!isConfirmed) return;

        try {
            await faqService.deleteFaq(faqId);
            showToast("FAQ deleted successfully", "success");
            await loadFaqs();
        } catch (error) {
            const message = error?.response?.data?.message || "Failed to delete FAQ";
            showToast(message, "error");
        }
    };

    return (
        <div className="faq-page">
            <div className="faq-header">
                <div className="faq-header-left">
                    <h2 className="faq-title">FAQ</h2>
                </div>
                <div className="faq-header-actions-left">
                    <button className="btn-secondary" onClick={loadFaqs} disabled={isLoading}>
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
                {isLoading ? (
                    <div className="faq-loader-container">
                        <i className="fas fa-spinner fa-spin faq-loader-icon" />
                        <p className="faq-loader-text">Loading FAQs...</p>
                    </div>
                ) : faqs.map((faq) => (
                    <div className="faq-card" key={faq.id}>
                        {faq.question && <div className="faq-card-content">
                            <div className="faq-card-question-row">
                                <ForumOutlinedIcon fontSize="medium" />
                                <h4 className="faq-card-question">{faq.question}</h4>
                            </div>
                            <p className="faq-card-answer">{faq.answer}</p>
                        </div>}
                        {faq.link && <div className="faq-card-content">
                            <div className="faq-card-question-row">
                                <LinkIcon fontSize="medium" />
                                <a href={faq.link} target="_blank" rel="noopener noreferrer" className="faq-card-link-text">
                                    {faq.link}
                                </a>
                            </div>  
                        </div>}
                        <div className="faq-card-actions">
                            <span className={`faq-status-badge ${faq.embedding ? "faq-status-trained" : "faq-status-not-trained"}`}>
                                {faq.embedding ? "Trained" : "Not Trained"}
                            </span>
                            <button type="button" className="faq-icon-btn" aria-label="Edit FAQ" onClick={() => handleEditFaq(faq.id)}>
                                <i className="fas fa-pen" />
                            </button>
                            <button type="button" className="faq-icon-btn" aria-label="Delete FAQ" onClick={() => handleDeleteFaq(faq.id)}>
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
                        <div className="faq-sidebar-title">{isEditMode ? "Update FAQ" : "Add New FAQ"}</div>
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
                            onClick={handleSubmitFaq}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <><i className="fas fa-spinner fa-spin" /> {isEditMode ? "Updating..." : "Adding..."}</>
                            ) : (
                                <><i className="fas fa-check" /> {isEditMode ? "Update" : "Add"}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQPage;
