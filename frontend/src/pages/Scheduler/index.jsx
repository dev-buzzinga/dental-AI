import { useContext, useEffect, useMemo, useState } from "react";
import "../../styles/scheduler.css";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";
import { getSchedulerConfig, saveSchedulerConfig } from "../../service/scheduler";

const STEPS = ["Design", "Appointment Form", "Deploy"];

const FONT_FAMILIES = [
    { label: "Roboto", value: "Roboto, sans-serif" },
    { label: "Inter", value: "Inter, sans-serif" },
    { label: "Open Sans", value: "Open Sans, sans-serif" },
    { label: "Lato", value: "Lato, sans-serif" },
    { label: "Montserrat", value: "Montserrat, sans-serif" },
    { label: "Nunito", value: "Nunito, sans-serif" },
    { label: "Poppins", value: "Poppins, sans-serif" },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Helvetica", value: "Helvetica, sans-serif" },
    { label: "Georgia", value: "Georgia, serif" },
];

const DEFAULT_CONFIG = {
    title: "Book Your Appointment",
    subtitle: "Schedule your appointment with us",
    primary_color: "#7e19d2",
    secondary_color: "#f5f5f5",
    font_family: "Roboto, sans-serif",
    logo_url: "",
    welcome_message: "Welcome! Please select your preferred appointment time.",
    appointment_types_enabled: true,
    problem_description_enabled: true,
    date_selection_enabled: true,
    time_slot_selection_enabled: true,
    patient_info_enabled: true,
    confirmation_enabled: true,
    character_limit: 200,
    problemPlaceholder: "Describe your problem in detail",
    custom_fields: [],
    redirect_url: "",
};

const validateRedirectUrl = (url) => {
    if (!url || url.trim() === "") return "";

    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") {
            return "Redirect URL must use HTTPS protocol";
        }
        return "";
    } catch (_error) {
        return "Please enter a valid URL (e.g., https://example.com/thank-you)";
    }
};

const Schedulerpage = () => {
    const { user } = useContext(AuthContext);
    const showToast = useToast();

    const [loading, setLoading] = useState(true);
    const [activeStep, setActiveStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [deployed, setDeployed] = useState(false);
    const [copyModalOpen, setCopyModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [uniqueKey, setUniqueKey] = useState("");
    const [redirectUrlError, setRedirectUrlError] = useState("");

    const widgetLink = useMemo(() => {
        return uniqueKey ? `${window.location.origin}/public-scheduler?key=${uniqueKey}` : "";
    }, [uniqueKey]);

    useEffect(() => {
        const contextUniqueKey =
            user?.unique_key || user?.user_metadata?.unique_key || user?.app_metadata?.unique_key || "";

        if (contextUniqueKey) {
            setUniqueKey(contextUniqueKey);
        }
    }, [user]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                setLoading(true);
                const response = await getSchedulerConfig();
                if (response?.success && response?.data?.widget_props) {
                    const incoming = response.data.widget_props;
                    setConfig((prev) => ({ ...prev, ...incoming }));
                    setDeployed(true);

                    const incomingUniqueKey =
                        response?.data?.unique_key ||
                        user?.unique_key ||
                        user?.user_metadata?.unique_key ||
                        user?.app_metadata?.unique_key ||
                        "";
                    if (incomingUniqueKey) setUniqueKey(incomingUniqueKey);

                    const redirectError = validateRedirectUrl(incoming.redirect_url);
                    setRedirectUrlError(redirectError);
                }
            } catch (error) {
                console.error("Error fetching scheduler config:", error);
                showToast("Failed to load scheduler configuration", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, [showToast]);

    const handleConfigChange = (field, value) => {
        setConfig((prev) => ({ ...prev, [field]: value }));

        if (field === "redirect_url") {
            setRedirectUrlError(validateRedirectUrl(value));
        }

        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const validateForm = () => {
        const nextErrors = {};

        if (!config.title?.trim()) nextErrors.title = "Title is required";
        if (!config.primary_color) nextErrors.primary_color = "Theme color is required";
        if (!config.secondary_color) nextErrors.secondary_color = "Text color is required";

        const redirectError = validateRedirectUrl(config.redirect_url);
        setRedirectUrlError(redirectError);

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0 && !redirectError;
    };

    const handleSave = async () => {
        if (!validateForm()) return false;

        try {
            setSaving(true);
            const response = await saveSchedulerConfig({ widget_props: config });

            if (response?.success) {
                setDeployed(true);
                setActiveStep(STEPS.length - 1);

                const savedUniqueKey =
                    response?.data?.unique_key ||
                    user?.unique_key ||
                    user?.user_metadata?.unique_key ||
                    user?.app_metadata?.unique_key ||
                    uniqueKey;
                if (savedUniqueKey) setUniqueKey(savedUniqueKey);

                showToast(response?.message || "Scheduler configuration saved successfully", "success");
                return true;
            }

            showToast(response?.message || "Failed to save scheduler configuration", "error");
        } catch (error) {
            console.error("Error saving scheduler config:", error);
            showToast("Failed to save scheduler configuration", "error");
        } finally {
            setSaving(false);
        }

        return false;
    };

    const handleNext = async () => {
        if (activeStep === STEPS.length - 1) {
            await handleSave();
            return;
        }
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setActiveStep((prev) => Math.max(0, prev - 1));
    };

    const handleOpenPreview = () => {
        try {
            localStorage.setItem("schedulerPreviewConfig", JSON.stringify(config));
        } catch (error) {
            console.error("Failed to store scheduler preview config:", error);
        }

        const previewKey =
            uniqueKey || user?.unique_key || user?.user_metadata?.unique_key || user?.app_metadata?.unique_key || "";
        const previewUrl = `${window.location.origin}/public-scheduler?key=${previewKey}&preview=true`;
        window.open(previewUrl, "_blank", "noopener,noreferrer");
    };

    const handleCopyLink = async () => {
        if (!widgetLink) return;

        try {
            await navigator.clipboard.writeText(widgetLink);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error("Failed to copy widget link:", error);
            showToast("Failed to copy link", "error");
        }
    };

    if (loading) {
        return (
            <div className="scheduler-page">
                <div className="scheduler-header">
                    <div className="scheduler-header-left">
                        <h2 className="scheduler-title">Scheduler Web Page</h2>
                    </div>
                </div>
                <div className="scheduler-loader-wrap">
                    <i className="fas fa-spinner fa-spin scheduler-loader-icon" />
                    <span>Loading scheduler settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="scheduler-page">
            <div className="scheduler-header">
                <div className="scheduler-header-left">
                    <h2 className="scheduler-title">Scheduler Web Page</h2>
                </div>
            </div>

            <div className="scheduler-body custom-scrollbar">
                <div className="scheduler-grid">
                    <div className="scheduler-main-card">
                        <div className="scheduler-stepper">
                            {STEPS.map((step, index) => (
                                <div
                                    key={step}
                                    className={`scheduler-step ${index === activeStep ? "active" : ""} ${index < activeStep ? "done" : ""}`}
                                >
                                    <div className="scheduler-step-circle">
                                        {index < activeStep ? <i className="fas fa-check" /> : index + 1}
                                    </div>
                                    <span className="scheduler-step-label">{step}</span>
                                </div>
                            ))}
                        </div>

                        <div className={`scheduler-step-content ${activeStep === 2 ? "centered" : ""}`}>
                            {activeStep === 0 && (
                                <>
                                    <div className="scheduler-field">
                                        <label>Theme Color</label>
                                        <div className="scheduler-color-wrapper">
                                            <div className="scheduler-color-box" style={{ backgroundColor: config.primary_color }}>
                                                <i className="fas fa-eye-dropper" />
                                                <input
                                                    type="color"
                                                    value={config.primary_color}
                                                    onChange={(e) => handleConfigChange("primary_color", e.target.value)}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                className="scheduler-color-hex"
                                                value={config.primary_color}
                                                onChange={(e) => handleConfigChange("primary_color", e.target.value)}
                                            />
                                        </div>
                                        {errors.primary_color && <p className="scheduler-error">{errors.primary_color}</p>}
                                    </div>

                                    <div className="scheduler-field">
                                        <label>Text Color</label>
                                        <div className="scheduler-color-wrapper">
                                            <div className="scheduler-color-box" style={{ backgroundColor: config.secondary_color }}>
                                                <i className="fas fa-eye-dropper" />
                                                <input
                                                    type="color"
                                                    value={config.secondary_color}
                                                    onChange={(e) => handleConfigChange("secondary_color", e.target.value)}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                className="scheduler-color-hex"
                                                value={config.secondary_color}
                                                onChange={(e) => handleConfigChange("secondary_color", e.target.value)}
                                            />
                                        </div>
                                        {errors.secondary_color && <p className="scheduler-error">{errors.secondary_color}</p>}
                                    </div>

                                    <div className="scheduler-field">
                                        <label>Font Family</label>
                                        <select
                                            value={config.font_family}
                                            onChange={(e) => handleConfigChange("font_family", e.target.value)}
                                        >
                                            {FONT_FAMILIES.map((font) => (
                                                <option key={font.value} value={font.value}>
                                                    {font.label}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="scheduler-help">Font family for your scheduler page</p>
                                    </div>
                                </>
                            )}

                            {activeStep === 1 && (
                                <>
                                    <div className="scheduler-field">
                                        <label>Page Title</label>
                                        <input
                                            type="text"
                                            value={config.title}
                                            onChange={(e) => handleConfigChange("title", e.target.value)}
                                            placeholder="Page title"
                                        />
                                        {errors.title && <p className="scheduler-error">{errors.title}</p>}
                                    </div>

                                    <div className="scheduler-field">
                                        <label>Subtitle</label>
                                        <input
                                            type="text"
                                            value={config.subtitle}
                                            onChange={(e) => handleConfigChange("subtitle", e.target.value)}
                                            placeholder="Subtitle"
                                        />
                                    </div>

                                    <div className="scheduler-field">
                                        <label>Redirect URL (optional)</label>
                                        <input
                                            type="url"
                                            value={config.redirect_url}
                                            onChange={(e) => handleConfigChange("redirect_url", e.target.value)}
                                            placeholder="https://example.com/thank-you"
                                        />
                                        {redirectUrlError ? (
                                            <p className="scheduler-error">{redirectUrlError}</p>
                                        ) : (
                                            <p className="scheduler-help">Optional: where to redirect patients after successful booking.</p>
                                        )}
                                    </div>

                                    <div className="scheduler-field">
                                        <label>Welcome Message</label>
                                        <textarea
                                            rows={3}
                                            value={config.welcome_message}
                                            onChange={(e) => handleConfigChange("welcome_message", e.target.value)}
                                            placeholder="Welcome message"
                                        />
                                    </div>

                                    {config.problem_description_enabled && (
                                        <>
                                            <div className="scheduler-field">
                                                <label>Character Limit</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={config.character_limit}
                                                    onChange={(e) => handleConfigChange("character_limit", Number(e.target.value || 0))}
                                                />
                                            </div>

                                            <div className="scheduler-field">
                                                <label>Problem Description Placeholder</label>
                                                <input
                                                    type="text"
                                                    value={config.problemPlaceholder}
                                                    onChange={(e) => handleConfigChange("problemPlaceholder", e.target.value)}
                                                    placeholder="Describe your problem in detail"
                                                />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {activeStep === 2 && (
                                <div className="scheduler-deploy-panel">
                                    <div className="scheduler-deploy-icon-wrap">
                                        <i className="fas fa-check" />
                                    </div>
                                    <h3>{uniqueKey ? "Update Widget" : "Deploy Widget"}</h3>
                                    <p>
                                        {uniqueKey
                                            ? "You can update your widget configuration at any time. Click Update Widget below to update your live widget."
                                            : "Deploy your scheduler widget to make it live and shareable for your patients."}
                                    </p>

                                    {deployed && uniqueKey && (
                                        <button className="scheduler-copy-link-btn" onClick={() => setCopyModalOpen(true)}>
                                            <i className="fas fa-link" /> COPY WIDGET LINK
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="scheduler-actions">
                            <button className="btn-secondary" disabled={activeStep === 0 || saving} onClick={handleBack}>
                                Back
                            </button>
                            <button className="btn-primary" disabled={saving} onClick={activeStep === STEPS.length - 1 ? handleSave : handleNext}>
                                {saving ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin" /> Saving...
                                    </>
                                ) : activeStep === STEPS.length - 1 ? (
                                    deployed ? "Update Widget" : "Deploy Widget"
                                ) : (
                                    "Next"
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="scheduler-preview-card">
                        <div className="scheduler-preview-header">
                            <h4>Preview</h4>
                            <p>Test your scheduler configuration</p>
                        </div>

                        <div className="scheduler-preview-content">
                            <div className="scheduler-preview-eye-circle">
                                <div className="scheduler-preview-eye-inner">
                                    <i className="fas fa-eye" />
                                </div>
                            </div>

                            <h3>Preview Your Scheduler</h3>
                            <p className="scheduler-preview-desc">
                                Click the button below to see how your scheduler will look to patients in a new tab
                            </p>

                            <button className="scheduler-preview-main-btn" onClick={handleOpenPreview}>
                                <i className="fas fa-eye" /> Open Preview
                            </button>

                            <div className="scheduler-preview-tip">
                                <i className="fas fa-lightbulb" />
                                <span>Tip: The preview will open in a new tab so you can continue editing while viewing</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {copyModalOpen && (
                <div className="scheduler-modal-backdrop" onClick={() => setCopyModalOpen(false)}>
                    <div className="scheduler-modal" onClick={(e) => e.stopPropagation()}>
                        <h4>Widget Link</h4>
                        <div className="scheduler-modal-input-group">
                            <input type="text" value={widgetLink} readOnly />
                            <button className="scheduler-modal-copy-btn" onClick={handleCopyLink}>
                                {copySuccess ? "Copied!" : "Copy"}
                            </button>
                        </div>
                        <p className="scheduler-modal-help">
                            Share this link with your patients or embed it in your website.
                        </p>
                        <div className="scheduler-modal-actions">
                            <button className="scheduler-modal-close-btn" onClick={() => setCopyModalOpen(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedulerpage;
