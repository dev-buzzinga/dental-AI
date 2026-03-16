import PropTypes from 'prop-types';
import '../common/common.css';

const AddTemplateModal = ({
    isOpen,
    onClose,
    templateName,
    onTemplateNameChange,
    templateDetails,
    onTemplateDetailsChange,
    onSave,
    isSaving,
}) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleBackdropClick}>
            <div className="add-template-modal">
                <div className="template-modal-header">
                    <h3>
                        <i className="fas fa-file-alt" />
                        Create New Template
                    </h3>
                    <button
                        type="button"
                        className="close-btn"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        &times;
                    </button>
                </div>

                <div className="template-modal-body">
                    <div className="template-form-group">
                        <label htmlFor="template-name">Template Name</label>
                        <input
                            id="template-name"
                            type="text"
                            value={templateName}
                            onChange={(e) => onTemplateNameChange(e.target.value)}
                            placeholder="e.g., Initial Consultation, Follow-up"
                            className="template-input"
                        />
                    </div>

                    <div className="template-form-group">
                        <label htmlFor="template-details">Template Details</label>
                        <textarea
                            id="template-details"
                            value={templateDetails}
                            onChange={(e) => onTemplateDetailsChange(e.target.value)}
                            placeholder="Enter template details, notes, or guidelines..."
                            className="template-textarea"
                            rows={5}
                        />
                    </div>
                </div>

                <div className="template-modal-footer">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-save"
                        onClick={onSave}
                        disabled={!templateName.trim() || isSaving}
                    >
                        {isSaving ? (
                            <>
                                <i className="fas fa-spinner fa-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check" /> Save Template
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

AddTemplateModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    templateName: PropTypes.string.isRequired,
    onTemplateNameChange: PropTypes.func.isRequired,
    templateDetails: PropTypes.string.isRequired,
    onTemplateDetailsChange: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    isSaving: PropTypes.bool,
};

AddTemplateModal.defaultProps = {
    isSaving: false,
};

export default AddTemplateModal;
