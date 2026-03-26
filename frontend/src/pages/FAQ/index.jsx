import { useState } from 'react';
import "../../styles/faq.css"

const FAQPage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('qna');

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
            <div className={`faq-sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                <div className="faq-sidebar" onClick={(e) => e.stopPropagation()}>
                    <div className="faq-sidebar-header">
                        <div className="faq-sidebar-title">Add New FAQ</div>
                        <button className="faq-sidebar-close" onClick={() => setIsSidebarOpen(false)}>
                            <i className="fas fa-times" />
                        </button>
                    </div>

                    <div className="faq-sidebar-body">
                        {/* Tabs */}
                        <div className="faq-tabs">
                            <button
                                className={`faq-tab-btn ${activeTab === 'qna' ? 'active' : ''}`}
                                onClick={() => setActiveTab('qna')}
                            >
                                <i class="fa-regular fa-comments"></i> Q & A
                            </button>
                            <button
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
                                        <i className="fa-regular fa-comment-dots" />
                                        <textarea placeholder="Add question text" rows={2} />
                                    </div>
                                </div>
                                <div className="faq-form-group">
                                    <label className="faq-label">Answer</label>
                                    <div className="faq-input-wrapper">
                                        <i className="fa-regular fa-comment-dots fa-flip-horizontal" />
                                        <textarea placeholder="Add answer text" rows={4} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="faq-link-form fade-in">
                                <div className="faq-form-group">
                                    <label className="faq-label">Custom Link</label>
                                    <div className="faq-input-wrapper">
                                        <i className="fas fa-link" />
                                        <input type="text" placeholder="Enter custom URL" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="faq-sidebar-footer">
                        <button className="btn-cancel" onClick={() => setIsSidebarOpen(false)}>CANCEL</button>
                        <button className="btn-add-faq">ADD</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQPage;
