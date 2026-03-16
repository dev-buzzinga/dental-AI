import { useContext, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/VoiceNotes.css';
import VoiceTranscriptPanel from '../../components/VoiceNotes/VoiceTranscriptPanel';
import AISummaryPanel from '../../components/VoiceNotes/AISummaryPanel';
import AddTemplateModal from '../../components/VoiceNotes/AddTemplateModal';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';

const AddVoiceNotePage = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);
    const [isAddingTemplate, setIsAddingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDetails, setNewTemplateDetails] = useState('');
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [patientId, setPatientId] = useState('');
    const [doctorId, setDoctorId] = useState('');
    const [dateCreated, setDateCreated] = useState(() => new Date().toISOString().slice(0, 10));
    const [templateId, setTemplateId] = useState('');
    const [description, setDescription] = useState('');
    const [transcript, setTranscript] = useState('');
    const [summary, setSummary] = useState('');
    const [isRecording, setIsRecording] = useState(false);

    const selectedPatient = useMemo(
        () => patients.find((p) => p.id === patientId),
        [patientId, patients]
    );

    const selectedDoctor = useMemo(
        () => doctors.find((d) => d.id === doctorId),
        [doctorId, doctors]
    );

    useEffect(() => {
        const fetchDropdownData = async () => {
            if (!user?.id) return;
            setIsLoadingDropdowns(true);

            try {
                const [{ data: patientsData, error: patientsError }, { data: doctorsData, error: doctorsError }, { data: templatesData, error: templatesError }] =
                    await Promise.all([
                        supabase
                            .from('patients')
                            .select('id, name, phone, email')
                            .eq('user_id', user.id),
                        supabase
                            .from('doctors')
                            .select('id, name')
                            .eq('user_id', user.id),
                        supabase
                            .from('voice_notes_template')
                            .select('id, name')
                            .eq('user_id', user.id),
                    ]);

                if (patientsError) {
                    // eslint-disable-next-line no-console
                    console.error('Error fetching patients:', patientsError);
                } else {
                    setPatients(patientsData || []);
                }

                if (doctorsError) {
                    // eslint-disable-next-line no-console
                    console.error('Error fetching doctors:', doctorsError);
                } else {
                    setDoctors(doctorsData || []);
                }

                if (templatesError) {
                    // eslint-disable-next-line no-console
                    console.error('Error fetching templates:', templatesError);
                } else {
                    setTemplates(templatesData || []);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error fetching dropdown data:', error);
            } finally {
                setIsLoadingDropdowns(false);
            }
        };

        fetchDropdownData();
    }, [user]);

    const handleToggleRecording = () => {
        setIsRecording((prev) => !prev);
        if (!isRecording && !transcript) {
            setTranscript(
                'Transcript will appear here as you record. (Placeholder only, no audio is being captured.)'
            );
        }
    };

    const handleClose = () => {
        navigate('/voice-notes');
    };

    const handleDeleteSummary = () => {
        setSummary('');
    };

    const handleRegenerateSummary = () => {
        if (!transcript) {
            setSummary(
                'Summary could not be generated because there is no transcript yet. This is placeholder logic only.'
            );
            return;
        }
        setSummary(
            'This is a placeholder AI summary generated from the recorded transcript. In production, this would be created by your AI backend service.'
        );
    };

    const handleCopySummary = () => {
        if (!summary) return;
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(summary).catch(() => {
                // swallow clipboard errors in placeholder mode
            });
        }
    };

    const handleExportPdf = () => {
        // Placeholder only – no real export
        // Could be replaced with real export logic later
        // eslint-disable-next-line no-alert
        alert('PDF export is not implemented in this prototype.');
    };

    const handleSaveNewTemplate = async () => {
        if (!user?.id || !newTemplateName.trim() || isSavingTemplate) return;

        setIsSavingTemplate(true);
        try {
            const { data, error } = await supabase
                .from('voice_notes_template')
                .insert({
                    user_id: user.id,
                    name: newTemplateName.trim(),
                    details: newTemplateDetails.trim() || null,
                })
                .select('id, name')
                .single();

            if (error) {
                // eslint-disable-next-line no-console
                console.error('Error saving template:', error);
                return;
            }

            if (data) {
                setTemplates((prev) => [...prev, data]);
                setTemplateId(data.id);
                setNewTemplateName('');
                setNewTemplateDetails('');
                setIsAddingTemplate(false);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Unexpected error saving template:', error);
        } finally {
            setIsSavingTemplate(false);
        }
    };

    return (
        <div className="voice-notes-page">
            <div className="voice-notes-header">
                <div className="voice-notes-header-left">
                    <h2 className="voice-notes-title">Add Voice Notes</h2>
                </div>
            </div>
            <div className="voice-notes-content" style={{ paddingTop: 0 }}>
                <div className="voice-notes-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-body">
                        <div className="voice-notes-top-row">
                            <div className="voice-notes-field">
                                <SearchableDropdown
                                    label="Patient Name"
                                    required={false}
                                    placeholder={isLoadingDropdowns ? 'Loading patients...' : 'Select patient'}
                                    options={patients}
                                    value={patientId}
                                    onChange={(opt) => setPatientId(opt?.id || '')}
                                    searchKeys={['name', 'phone', 'email']}
                                    renderOption={(p) => (
                                        <span>
                                            {p.name}
                                            {p.phone ? ` - ${p.phone}` : ''}
                                            {p.email ? ` (${p.email})` : ''}
                                        </span>
                                    )}
                                    displayValue={(p) => {
                                        if (!p) return '';
                                        return `${p.name}${p.phone ? ` - ${p.phone}` : ''}${p.email ? ` (${p.email})` : ''
                                            }`;
                                    }}
                                />
                            </div>

                            <div className="voice-notes-field">
                                <SearchableDropdown
                                    label="Doctor Name"
                                    required={false}
                                    placeholder={isLoadingDropdowns ? 'Loading doctors...' : 'Select doctor'}
                                    options={doctors}
                                    value={doctorId}
                                    onChange={(opt) => setDoctorId(opt?.id || '')}
                                    searchKeys={['name']}
                                />
                            </div>

                            <div className="voice-notes-field">
                                <div className="sd-container">
                                    <label>Date Created</label>
                                    <input
                                        type="date"
                                        value={dateCreated}
                                        onChange={(e) => setDateCreated(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="voice-notes-field">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                    <label>Select Template</label>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{
                                            paddingInline: 10,
                                            fontSize: 12,
                                            height: 28,
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '4px 10px',
                                        }}
                                        onClick={() => setIsAddingTemplate(true)}
                                    >
                                        + New
                                    </button>
                                </div>
                                <SearchableDropdown
                                    label=""
                                    required={false}
                                    placeholder={isLoadingDropdowns ? 'Loading templates...' : 'Select template'}
                                    options={templates}
                                    value={templateId}
                                    onChange={(opt) => setTemplateId(opt?.id || '')}
                                    searchKeys={['name']}
                                />
                            </div>
                        </div>

                        <div className="voice-notes-description">
                            <div className="voice-notes-field">
                                <label>Description</label>
                                <textarea
                                    placeholder="Add a description for this voice note..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="voice-notes-main-grid">
                            <VoiceTranscriptPanel
                                transcript={transcript}
                                onTranscriptChange={setTranscript}
                                isRecording={isRecording}
                                onToggleRecording={handleToggleRecording}
                            />
                            <AISummaryPanel
                                summary={summary}
                                onDelete={handleDeleteSummary}
                                onRegenerate={handleRegenerateSummary}
                                onCopy={handleCopySummary}
                                onExportPdf={handleExportPdf}
                            />
                        </div>

                        <div
                            style={{
                                marginTop: 12,
                                fontSize: 11,
                                color: 'var(--text-secondary)',
                            }}
                        >
                            {selectedPatient && (
                                <span>
                                    <strong>Patient:</strong> {selectedPatient.name}{' '}
                                </span>
                            )}
                            {selectedDoctor && (
                                <span>
                                    &middot; <strong>Doctor:</strong> {selectedDoctor.name}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-save"
                            onClick={handleClose}
                        >
                            <i className="fas fa-check" />
                            Save Note (Mock)
                        </button>
                    </div>
                </div>

                <AddTemplateModal
                    isOpen={isAddingTemplate}
                    onClose={() => {
                        setIsAddingTemplate(false);
                        setNewTemplateName('');
                        setNewTemplateDetails('');
                    }}
                    templateName={newTemplateName}
                    onTemplateNameChange={setNewTemplateName}
                    templateDetails={newTemplateDetails}
                    onTemplateDetailsChange={setNewTemplateDetails}
                    onSave={handleSaveNewTemplate}
                    isSaving={isSavingTemplate}
                />
            </div>
        </div>
    );
};

export default AddVoiceNotePage;

