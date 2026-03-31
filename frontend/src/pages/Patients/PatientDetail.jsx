import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    User,
    Phone,
    Mail,
    Calendar,
    Clock,
    Stethoscope,
    ShieldCheck,
    FileText,
    History,
    ChevronRight,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info,
    ArrowRight,
    Printer,
    Download,
    MoreVertical,
    ArrowLeft,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import patientsService from '../../service/patients';
import PatientModal from '../../components/Patients/PatientModal';
import { supabase } from '../../config/supabase';
import { useToast } from '../../components/Toast/Toast';

const INSURANCE_PLAN = {
    subscriberName: 'Sarah Montgomery',
    ssnMasked: 'XXX-XX-8842',
    memberId: 'DELTA-9928374',
    dob: '1988-05-14',
    company: 'Delta Dental PPO',
    phone: '1-800-DELTA-D',
    groupName: 'TechCorp Global Benefits',
    groupNumber: 'GRP-88271',
    payerId: '60061',
    effectiveDate: '2025-01-01',
    emailFax: 'claims@deltadental.com',
    timelyFiling: '12 months from DOS',
};

const COVERAGE_DETAILS = {
    networkStatus: 'In-Network',
    feeSchedule: 'PPO',
    planYearType: 'Calendar Year',
    planYearStart: '2026-01-01',
    planYearEnd: '2026-12-31',
    yearlyMax: 2500,
    yearlyMaxUsed: 850,
    deductibleIndividual: 50,
    deductibleIndividualMet: 50,
    deductibleFamily: 150,
    deductibleFamilyMet: 100,
    coverageType: 'Employee + Family',
    dependentAgeLimit: 26,
    cobRule: 'Standard',
    waitingPeriod: { has: false, details: 'None' },
    missingToothClause: { has: true, details: 'Applies to teeth missing prior to effective date' },
    poBox: 'P.O. Box 9120, Farmington Hills, MI 48333',
};

const COVERAGE_CATEGORIES = [
    { category: 'Preventive/Perio', percentage: 100, deductibleApplies: false, restorative: false, endo: false, perio: true, oralSurgery: false },
    { category: 'Basic', percentage: 80, deductibleApplies: true, restorative: true, endo: true, perio: true, oralSurgery: true },
    { category: 'Major', percentage: 50, deductibleApplies: true, restorative: true, endo: true, perio: true, oralSurgery: true },
    {
        category: 'Orthodontic',
        percentage: 50,
        deductibleApplies: false,
        restorative: false,
        endo: false,
        perio: false,
        oralSurgery: false,
        orthoDetails: {
            codes: ['D8080', 'D8090'],
            lifetimeMax: 2000,
            ageLimit: 19,
            workInProgress: true,
            paymentFrequency: 'Monthly'
        }
    },
];

const PROCEDURE_CODES = [
    { code: 'D0120', description: 'Periodic Oral Evaluation', category: 'Diagnostic', frequency: '2x per year', interval: '6 months', percentage: 100, deductibleApplies: false, covered: true, txSameDay: true, notes: 'Includes bitewings' },
    { code: 'D0150', description: 'Comprehensive Oral Eval', category: 'Diagnostic', frequency: '1x per 3 years', interval: '36 months', percentage: 100, deductibleApplies: false, covered: true, txSameDay: true, notes: 'New patients only' },
    { code: 'D0210', description: 'Intraoral - Complete Series', category: 'Diagnostic', frequency: '1x per 5 years', interval: '60 months', percentage: 100, deductibleApplies: false, covered: true, txSameDay: true, notes: 'FMX' },
    { code: 'D1110', description: 'Prophylaxis - Adult', category: 'Preventive', frequency: '2x per year', interval: '6 months', percentage: 100, deductibleApplies: false, covered: true, txSameDay: true, notes: 'Standard cleaning' },
    { code: 'D1206', description: 'Topical Fluoride Varnish', category: 'Preventive', frequency: '2x per year', interval: '6 months', percentage: 100, deductibleApplies: false, covered: true, txSameDay: true, notes: 'Up to age 19' },
    { code: 'D1351', description: 'Sealant - Per Tooth', category: 'Preventive', frequency: '1x per lifetime', interval: 'N/A', percentage: 100, deductibleApplies: false, covered: true, txSameDay: true, notes: 'Molars only' },
    { code: 'D2140', description: 'Amalgam - 1 Surface', category: 'Restorative', frequency: 'N/A', interval: 'N/A', percentage: 80, deductibleApplies: true, covered: true, txSameDay: true, notes: 'Silver filling' },
    { code: 'D2330', description: 'Resin-Based Composite - 1 Surf', category: 'Restorative', frequency: 'N/A', interval: 'N/A', percentage: 80, deductibleApplies: true, covered: true, txSameDay: true, notes: 'Anterior teeth' },
    { code: 'D2391', description: 'Resin-Based Composite - 1 Surf', category: 'Restorative', frequency: 'N/A', interval: 'N/A', percentage: 80, deductibleApplies: true, covered: true, txSameDay: true, notes: 'Posterior teeth' },
    { code: 'D2740', description: 'Crown - Porcelain/Ceramic', category: 'Restorative', frequency: '1x per 7 years', interval: '84 months', percentage: 50, deductibleApplies: true, covered: true, txSameDay: false, notes: 'High strength' },
    { code: 'D3310', description: 'Endodontic Therapy - Anterior', category: 'Endodontics', frequency: '1x per tooth', interval: 'N/A', percentage: 80, deductibleApplies: true, covered: true, txSameDay: false, notes: 'Root canal' },
    { code: 'D3330', description: 'Endodontic Therapy - Molar', category: 'Endodontics', frequency: '1x per tooth', interval: 'N/A', percentage: 80, deductibleApplies: true, covered: true, txSameDay: false, notes: 'Root canal' },
    { code: 'D4341', description: 'Perio Scaling & Root Planing', category: 'Periodontics', frequency: '1x per 2 years', interval: '24 months', percentage: 80, deductibleApplies: true, covered: true, txSameDay: false, notes: 'Deep cleaning' },
    { code: 'D4910', description: 'Periodontal Maintenance', category: 'Periodontics', frequency: '4x per year', interval: '3 months', percentage: 100, deductibleApplies: false, covered: true, txSameDay: true, notes: 'Following SRP' },
    { code: 'D5110', description: 'Complete Denture - Maxillary', category: 'Prosthodontics', frequency: '1x per 7 years', interval: '84 months', percentage: 50, deductibleApplies: true, covered: true, txSameDay: false, notes: 'Upper' },
    { code: 'D6010', description: 'Surgical Placement Implant', category: 'Prosthodontics', frequency: '1x per lifetime', interval: 'N/A', percentage: 50, deductibleApplies: true, covered: true, txSameDay: false, notes: 'Titanium' },
    { code: 'D7140', description: 'Extraction - Erupted Tooth', category: 'Oral Surgery', frequency: 'N/A', interval: 'N/A', percentage: 80, deductibleApplies: true, covered: true, txSameDay: true, notes: 'Simple' },
    { code: 'D7210', description: 'Surgical Extraction', category: 'Oral Surgery', frequency: 'N/A', interval: 'N/A', percentage: 80, deductibleApplies: true, covered: true, txSameDay: false, notes: 'Complex' },
    { code: 'D8080', description: 'Comprehensive Orthodontic', category: 'Orthodontics', frequency: '1x per lifetime', interval: 'N/A', percentage: 50, deductibleApplies: false, covered: true, txSameDay: false, notes: 'Adolescent' },
    { code: 'D8090', description: 'Comprehensive Orthodontic', category: 'Orthodontics', frequency: '1x per lifetime', interval: 'N/A', percentage: 50, deductibleApplies: false, covered: true, txSameDay: false, notes: 'Adult' },
    { code: 'D9222', description: 'Deep Sedation/Anesthesia', category: 'Anesthesia', frequency: 'N/A', interval: 'N/A', percentage: 80, deductibleApplies: true, covered: true, txSameDay: true, notes: 'First 15 min' },
    { code: 'D9999', description: 'Unspecified Procedure', category: 'Other', frequency: 'N/A', interval: 'N/A', percentage: 0, deductibleApplies: false, covered: false, txSameDay: false, notes: 'Requires review' },
    { code: 'D0330', description: 'Panoramic Radiographic Image', category: 'Diagnostic', frequency: '1x per 3 years', interval: '36 months', percentage: 100, deductibleApplies: false, covered: true, txSameDay: true, notes: 'Pano' },
    { code: 'D0274', description: 'Bitewings - Four Images', category: 'Diagnostic', frequency: '1x per year', interval: '12 months', percentage: 100, deductibleApplies: false, covered: true, txSameDay: true, notes: 'BWX' },
    { code: 'D2750', description: 'Crown - Porcelain to Metal', category: 'Restorative', frequency: '1x per 7 years', interval: '84 months', percentage: 50, deductibleApplies: true, covered: true, txSameDay: false, notes: 'Standard crown' },
];

const COVERED_MEMBERS = [
    { name: 'Sarah Montgomery', dob: '1988-05-14', prophy: '2026-01-15', fmd: 'N/A', srp: '2024-06-10', fmx: '2023-01-10', pano: '2025-05-20', bwx: '2026-01-15', regularExam: '2026-01-15', emergencyExam: 'N/A' },
    { name: 'Michael Montgomery', dob: '1985-09-22', prophy: '2025-12-01', fmd: 'N/A', srp: 'N/A', fmx: '2022-08-15', pano: '2024-11-10', bwx: '2025-12-01', regularExam: '2025-12-01', emergencyExam: '2026-02-14' },
    { name: 'Lily Montgomery', dob: '2015-03-12', prophy: '2025-11-10', fmd: 'N/A', srp: 'N/A', fmx: 'N/A', pano: '2025-11-10', bwx: '2025-11-10', regularExam: '2025-11-10', emergencyExam: 'N/A' },
];

const VERIFICATION_LOG = {
    verifiedBy: 'Emily Parker (Front Desk)',
    dateVerified: '2026-03-25',
    referenceNumber: 'REF-99283-XYZ',
    notes: 'Spoke with agent Mark. Confirmed that Invisalign is covered under Orthodontic benefits. Waiting period waived for new group. Missing tooth clause applies. FMX and Pano are interchangeable for frequency limits.',
};

// --- Components ---

const Badge = ({ children, color }) => {
    const colors = {
        green: 'bg-green-100 text-green-700 border-green-200',
        red: 'bg-red-100 text-red-700 border-red-200',
        blue: 'bg-[var(--primary-light)] text-[color:var(--primary)] border-gray-200/80',
        amber: 'bg-amber-100 text-amber-700 border-amber-200',
        gray: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
            {children}
        </span>
    );
};

const ProgressBar = ({ value, max, label, color = 'bg-[var(--primary)]' }) => {
    const percentage = Math.min(Math.round((value / max) * 100), 100);
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-gray-600">
                <span>{label}</span>
                <span>${value.toLocaleString()} / ${max.toLocaleString()} ({percentage}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${color}`}
                />
            </div>
        </div>
    );
};

const SectionHeader = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
        <div className="p-1.5 bg-[var(--primary-light)] rounded-lg text-[color:var(--primary)]">
            <Icon size={18} />
        </div>
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{title}</h3>
    </div>
);

const InfoItem = ({ label, value, icon: Icon }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-1.5">
            {Icon && <Icon size={14} className="text-[color:var(--primary)] opacity-75" />}
            <span className="text-sm font-medium text-gray-700">{value || 'N/A'}</span>
        </div>
    </div>
);

export default function PatientDetail() {
    const navigate = useNavigate();
    const { id: routePatientId } = useParams();
    const [activeTab, setActiveTab] = useState('overview');
    const [insuranceSubTab, setInsuranceSubTab] = useState(0);
    const [codeFilter, setCodeFilter] = useState('All');
    const [patientData, setPatientData] = useState({
        id: '',
        name: '',
        phone: '',
        email: '',
        dob: '',
        treatmentType: '',
        assignedDoctor: '',
        status: 'Active',
        insuranceVerified: false,
    });
    const [upcomingVisits, setUpcomingVisits] = useState([]);
    const [patientLoading, setPatientLoading] = useState(Boolean(routePatientId));
    const [upcomingLoading, setUpcomingLoading] = useState(Boolean(routePatientId));
    const [historyVisits, setHistoryVisits] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(Boolean(routePatientId));
    const [historyPdfLoading, setHistoryPdfLoading] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const showToast = useToast();

    const handlePrintHistory = () => {
        const table = document.getElementById('visit-history-table');
        if (!table) {
            window.print();
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) return;

        printWindow.document.write(`
      <html>
        <head>
          <title>Visit History</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 20px; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background-color: #f9fafb; text-transform: uppercase; font-size: 10px; color: #6b7280; }
            tr:nth-child(even) { background-color: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>Visit History</h1>
          ${table.outerHTML}
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const handleDownloadHistoryPdf = async () => {
        if (!historyVisits || historyVisits.length === 0) return;
        setHistoryPdfLoading(true);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const margin = 10;
            let y = margin + 8;

            pdf.setFontSize(14);
            pdf.text('Visit History', margin, y);
            y += 6;

            pdf.setFontSize(9);

            // Table headers
            const headers = ['S.No', 'Doctor', 'Date', 'Time', 'Treatment', 'Status'];
            const colWidths = [10, 35, 20, 18, 70, 20]; // must sum <= pdfWidth - 2*margin
            let x = margin;

            headers.forEach((header, idx) => {
                pdf.text(header, x, y);
                x += colWidths[idx];
            });

            y += 5;

            historyVisits.forEach((visit, index) => {
                if (y > 280) {
                    pdf.addPage();
                    y = margin + 8;
                }
                const row = [
                    String(index + 1),
                    visit.doctor_name || 'N/A',
                    visit.formated_date || visit.date || 'N/A',
                    visit.time || 'N/A',
                    visit.appointment_types_name || 'N/A',
                    visit.status || 'N/A',
                ];

                x = margin;
                row.forEach((cell, idx) => {
                    const text = typeof cell === 'string' ? cell : String(cell);
                    pdf.text(text.substring(0, 30), x, y); // simple truncation
                    x += colWidths[idx];
                });

                y += 5;
            });

            pdf.save('visit-history.pdf');
        } catch (error) {
            console.error('handleDownloadHistoryPdf error =>', error);
        } finally {
            setHistoryPdfLoading(false);
        }
    };

    const handleSavePatient = async (formData) => {
        try {
            const dataToUpdate = { ...formData };
            if (dataToUpdate.next_appointment === '') {
                delete dataToUpdate.next_appointment;
            }

            const patientId = (editingPatient && editingPatient.id) || routePatientId || patientData.id;

            const { error } = await supabase
                .from('patients')
                .update(dataToUpdate)
                .eq('id', patientId);

            if (error) throw error;

            showToast('Patient updated successfully!', 'success');
            setIsModalOpen(false);
            setEditingPatient(null);

            setPatientData((prev) => ({
                ...prev,
                name: dataToUpdate.name ?? prev.name,
                email: dataToUpdate.email ?? prev.email,
                phone: dataToUpdate.phone ?? prev.phone,
                dob: dataToUpdate.dob ?? prev.dob,
            }));
        } catch (error) {
            console.error('handleSavePatient error =>', error);
            showToast(error.message || 'Failed to update patient', 'error');
            throw error;
        }
    };

    const handleEditPatient = () => {
        const patientId = routePatientId || patientData.id;
        setEditingPatient({
            id: patientId,
            name: patientData.name,
            email: patientData.email,
            phone: patientData.phone,
            dob: patientData.dob,
            member_id: patientData.member_id,
        });
        setIsModalOpen(true);
    };

    useEffect(() => {
        if (!routePatientId) return;
        setPatientLoading(true);
        setUpcomingLoading(true);
        setHistoryLoading(true);

        const fetchPatientHeader = async () => {
            try {
                const response = await patientsService.getOnePatient(routePatientId);
                const apiPatient = response?.data?.data;
                if (!apiPatient) return;

                setPatientData((prev) => ({
                    ...prev,
                    id: apiPatient?.id || prev.id,
                    name: apiPatient?.name || apiPatient?.full_name || prev.name,
                    phone: apiPatient?.phone || apiPatient?.phone_number || prev.phone,
                    email: apiPatient?.email || prev.email,
                    dob: apiPatient?.dob || apiPatient?.date_of_birth || prev.dob,
                    //   treatmentType: apiPatient?.treatmentType || apiPatient?.treatment_type || prev.treatmentType,
                    //   assignedDoctor: apiPatient?.assignedDoctor || apiPatient?.assigned_doctor || prev.assignedDoctor,
                    status: apiPatient?.status || prev.status,
                    member_id: apiPatient?.member_id ?? apiPatient?.member_id ?? prev.member_id,
                }));
            } catch (error) {
                console.error('fetchPatientHeader error =>', error?.message || error);
            } finally {
                setPatientLoading(false);
            }
        };

        const fetchUpcomingVisit = async () => {
            try {
                const response = await patientsService.upcomingAppointment(routePatientId);
                const upcomingList = response?.data?.data;
                setUpcomingVisits(Array.isArray(upcomingList) ? upcomingList : []);
            } catch (error) {
                console.error('fetchUpcomingVisit error =>', error?.message || error);
            } finally {
                setUpcomingLoading(false);
            }
        };

        const fetchHistoryVisits = async () => {
            try {
                const response = await patientsService.historyAppointment(routePatientId);
                const historyList = response?.data?.data;
                setHistoryVisits(Array.isArray(historyList) ? historyList : []);
            } catch (error) {
                console.error('fetchHistoryVisits error =>', error?.message || error);
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchPatientHeader();
        fetchUpcomingVisit();
        fetchHistoryVisits();
    }, [routePatientId]);

    const filteredCodes = useMemo(() => {
        if (codeFilter === 'All') return PROCEDURE_CODES;
        return PROCEDURE_CODES.filter(code => code.category === codeFilter);
    }, [codeFilter]);

    const categories = ['All', ...new Set(PROCEDURE_CODES.map(c => c.category))];
    const hasUpcomingVisits = upcomingVisits.length > 0;

    const getPercentageColor = (pct) => {
        if (pct === 100) return 'text-green-600';
        if (pct >= 80) return 'text-blue-600';
        if (pct >= 50) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div className="min-h-screen bg-[#F8F9FC] text-gray-900 font-sans px-3 py-4 md:px-6 md:py-6 lg:px-8">
            <div className="w-full max-w-none mx-auto space-y-6">
                <button
                    type="button"
                    onClick={() => navigate('/patients')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--primary)] hover:text-[color:var(--primary-dark)] transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to Patients
                </button>

                {/* --- Header / Patient Summary --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-[var(--primary-light)] rounded-2xl flex items-center justify-center text-[color:var(--primary)] shadow-inner">
                            <User size={32} strokeWidth={1.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-gray-800">
                                    {patientLoading ? 'Loading patient...' : patientData.name}
                                </h1>
                                <div className="flex gap-2">
                                    <Badge color={patientLoading ? 'gray' : 'green'}>
                                        {patientLoading ? 'Loading...' : patientData.status}
                                    </Badge>
                                    {!patientLoading && patientData.insuranceVerified && (
                                        <Badge color="blue">Insurance Verified</Badge>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 font-medium mt-1">
                                {patientLoading
                                    ? 'Fetching patient details...'
                                    : (
                                        <>
                                            Patients ID: {patientData.member_id || 'N/A'}
                                            {/* {routePatientId ? ` • Route: ${routePatientId}` : ''} */}
                                            • DOB: {patientData.dob || 'N/A'}
                                        </>
                                    )}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full md:w-auto">
                        <InfoItem label="Phone" value={patientLoading ? 'Loading...' : patientData.phone} icon={Phone} />
                        <InfoItem label="Email" value={patientLoading ? 'Loading...' : patientData.email} icon={Mail} />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={handleEditPatient}
                            className="flex-1 md:flex-none px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-dark)] transition-colors shadow-lg shadow-[0_10px_24px_-6px_var(--primary-light)]"
                        >
                            Edit Patient
                        </button>
                        {/* <button className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
              <MoreVertical size={20} />
            </button> */}
                    </div>
                </div>

                {/* --- Navigation Tabs --- */}
                <div className="flex border-b border-gray-200 gap-8 px-2">
                    {[
                        { id: 'overview', label: 'Overview', icon: FileText },
                        { id: 'history', label: 'History Details', icon: History },
                        { id: 'insurance', label: 'Insurance Verification', icon: ShieldCheck },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-4 text-sm font-bold transition-all relative ${activeTab === tab.id ? 'text-[color:var(--primary)]' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full"
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* --- Main Content Area --- */}
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                        >
                            {/* Upcoming Visit Panel */}
                            <div className="lg:col-span-1 lg:max-w-[25rem]">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="bg-[var(--primary)] p-4 text-white flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={18} />
                                            <span className="font-bold text-sm uppercase tracking-wider">Upcoming Visit</span>
                                        </div>
                                        <Badge color={upcomingLoading ? 'gray' : 'blue'}>
                                            {upcomingLoading ? 'Loading...' : `${upcomingVisits.length} Visits`}
                                        </Badge>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {upcomingLoading && (
                                            <p className="text-sm font-medium text-gray-500">Loading upcoming visits...</p>
                                        )}
                                        {!upcomingLoading && !hasUpcomingVisits && (
                                            <p className="text-sm font-medium text-gray-500">No upcoming visits found.</p>
                                        )}
                                        {!upcomingLoading && hasUpcomingVisits && upcomingVisits.map((visit, index) => (
                                            <div
                                                key={`${visit.time}-${visit.doctor_name}-${index}`}
                                                className={`flex items-center gap-4 ${index !== upcomingVisits.length - 1 ? 'pb-4 border-b border-gray-100' : ''}`}
                                            >
                                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex flex-col items-center justify-center border border-gray-100">
                                                    <span className="text-[10px] font-bold text-[color:var(--primary)] uppercase">
                                                        {visit?.month_name || 'N/A'}
                                                    </span>
                                                    <span className="text-lg font-black text-gray-800 leading-none">
                                                        {visit?.date || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800">
                                                        {visit?.appointment_types_name || 'N/A'}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <Clock size={12} /> {visit?.time || 'N/A'} • {visit?.doctor_name || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            disabled={upcomingLoading || !hasUpcomingVisits}
                                            className="w-full py-2.5 bg-[var(--primary-light)] text-[color:var(--primary)] rounded-xl text-sm font-bold hover:brightness-[0.97] transition-colors flex items-center justify-center gap-2"
                                        >
                                            Reschedule <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'history' && (
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                        >
                            <div className="p-6 flex justify-between items-center border-b border-gray-50">
                                <h3 className="font-bold text-gray-800">Visit History</h3>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handlePrintHistory}
                                        className="p-2 text-gray-400 hover:text-[color:var(--primary)] transition-colors"
                                    >
                                        <Printer size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadHistoryPdf}
                                        disabled={historyPdfLoading}
                                        className="p-2 text-gray-400 hover:text-[color:var(--primary)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {historyPdfLoading ? (
                                            <i className="fas fa-spinner fa-spin" />
                                        ) : (
                                            <Download size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                <table id="visit-history-table" className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <th className="px-6 py-4">S.No</th>
                                            <th className="px-6 py-4">Assigned Doctor</th>
                                            <th className="px-6 py-4">Date & Time</th>
                                            <th className="px-6 py-4">Treatment</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {historyLoading && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                                    <i className="fas fa-spinner fa-spin table-empty-icon" /> Loading visit history...
                                                </td>
                                            </tr>
                                        )}
                                        {!historyLoading && historyVisits.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                                    No visit history found.
                                                </td>
                                            </tr>
                                        )}
                                        {!historyLoading && historyVisits.map((visit, idx) => (
                                            <tr key={`${visit.date}-${visit.time}-${idx}`} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 text-sm text-gray-500 font-medium">{idx + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-[var(--primary-light)] rounded-full flex items-center justify-center text-[color:var(--primary)] text-xs font-bold">
                                                            {(visit.doctor_name || '').split(' ').pop()?.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-700">{visit.doctor_name || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-700">{visit.formated_date || 'N/A'}</div>
                                                    <div className="text-[10px] text-gray-400">{visit.time || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {visit.appointment_types_name || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge color={visit.status === 'Completed' ? 'green' : 'amber'}>
                                                        {visit.status || 'N/A'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button type="button" className="text-[color:var(--primary)] hover:text-[color:var(--primary-dark)] text-xs font-bold flex items-center gap-1 ml-auto">
                                                        View Details <ChevronRight size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'insurance' && (
                        <motion.div
                            key="insurance"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {/* --- Insurance Sub-Navigation --- */}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {['General Info', 'Coverage Details', 'Categories', 'Procedure Codes', 'Members', 'Log'].map((label, idx) => (
                                    <button
                                        key={label}
                                        onClick={() => setInsuranceSubTab(idx)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${insuranceSubTab === idx
                                                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-[0_6px_20px_-6px_var(--primary-light)]'
                                                : 'bg-white text-gray-500 border-gray-100 hover:border-[var(--primary-light)] hover:text-[color:var(--primary)]'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* --- Section 1: Patient & Plan Information --- */}
                            {insuranceSubTab === 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <SectionHeader title="Patient & Plan Information" icon={User} />
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                        <InfoItem label="Subscriber Name" value={INSURANCE_PLAN.subscriberName} />
                                        <InfoItem label="Social Security #" value={INSURANCE_PLAN.ssnMasked} />
                                        <InfoItem label="Member ID" value={INSURANCE_PLAN.memberId} />
                                        <InfoItem label="Date of Birth" value={INSURANCE_PLAN.dob} />
                                        <InfoItem label="Insurance Company" value={INSURANCE_PLAN.company} />
                                        <InfoItem label="Insurance Phone" value={INSURANCE_PLAN.phone} icon={Phone} />
                                        <InfoItem label="Group Name" value={INSURANCE_PLAN.groupName} />
                                        <InfoItem label="Group Number" value={INSURANCE_PLAN.groupNumber} />
                                        <InfoItem label="Payer ID" value={INSURANCE_PLAN.payerId} />
                                        <InfoItem label="Effective Date" value={INSURANCE_PLAN.effectiveDate} />
                                        <InfoItem label="Email / Fax" value={INSURANCE_PLAN.emailFax} icon={Mail} />
                                        <InfoItem label="Timely Filing" value={INSURANCE_PLAN.timelyFiling} />
                                    </div>
                                </div>
                            )}

                            {/* --- Section 2: Coverage Details --- */}
                            {insuranceSubTab === 1 && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <SectionHeader title="Plan Limits & Deductibles" icon={AlertCircle} />
                                        <div className="space-y-6">
                                            <ProgressBar
                                                label="Yearly Maximum"
                                                value={COVERAGE_DETAILS.yearlyMaxUsed}
                                                max={COVERAGE_DETAILS.yearlyMax}
                                            />
                                            <div className="grid grid-cols-2 gap-6">
                                                <ProgressBar
                                                    label="Individual Deductible"
                                                    value={COVERAGE_DETAILS.deductibleIndividualMet}
                                                    max={COVERAGE_DETAILS.deductibleIndividual}
                                                    color="bg-amber-500"
                                                />
                                                <ProgressBar
                                                    label="Family Deductible"
                                                    value={COVERAGE_DETAILS.deductibleFamilyMet}
                                                    max={COVERAGE_DETAILS.deductibleFamily}
                                                    color="bg-amber-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-8 grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                                            <InfoItem label="Network Status" value={COVERAGE_DETAILS.networkStatus} />
                                            <InfoItem label="Fee Schedule" value={COVERAGE_DETAILS.feeSchedule} />
                                            <InfoItem label="Plan Year" value={`${COVERAGE_DETAILS.planYearType} (${COVERAGE_DETAILS.planYearStart} to ${COVERAGE_DETAILS.planYearEnd})`} />
                                            <InfoItem label="Coverage Type" value={COVERAGE_DETAILS.coverageType} />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <SectionHeader title="Rules & Clauses" icon={Info} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <InfoItem label="Dependent Age Limit" value={COVERAGE_DETAILS.dependentAgeLimit} />
                                            <InfoItem label="COB Rule" value={COVERAGE_DETAILS.cobRule} />
                                            <div className="col-span-full space-y-4">
                                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                    <div className={`p-1 rounded ${COVERAGE_DETAILS.waitingPeriod.has ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                                        {COVERAGE_DETAILS.waitingPeriod.has ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Waiting Period</span>
                                                        <p className="text-sm font-medium text-gray-700">{COVERAGE_DETAILS.waitingPeriod.details}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                    <div className={`p-1 rounded ${COVERAGE_DETAILS.missingToothClause.has ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                                        {COVERAGE_DETAILS.missingToothClause.has ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Missing Tooth Clause</span>
                                                        <p className="text-sm font-medium text-gray-700">{COVERAGE_DETAILS.missingToothClause.details}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <InfoItem label="P.O. Box Address" value={COVERAGE_DETAILS.poBox} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- Section 3: Coverage Categories --- */}
                            {insuranceSubTab === 2 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {COVERAGE_CATEGORIES.map((cat) => (
                                            <div key={cat.category} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="font-bold text-gray-800">{cat.category}</h4>
                                                    <span className={`text-2xl font-black ${getPercentageColor(cat.percentage)}`}>
                                                        {cat.percentage}%
                                                    </span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-gray-400 font-medium">Deductible Applies</span>
                                                        <span className={`font-bold ${cat.deductibleApplies ? 'text-amber-600' : 'text-green-600'}`}>
                                                            {cat.deductibleApplies ? 'Yes' : 'No'}
                                                        </span>
                                                    </div>
                                                    <div className="pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
                                                        {[
                                                            { label: 'Restorative', val: cat.restorative },
                                                            { label: 'Endo', val: cat.endo },
                                                            { label: 'Perio', val: cat.perio },
                                                            { label: 'Oral Surgery', val: cat.oralSurgery },
                                                        ].map(sub => (
                                                            <div key={sub.label} className="flex items-center gap-1.5">
                                                                {sub.val ? <CheckCircle2 size={12} className="text-green-500" /> : <XCircle size={12} className="text-gray-300" />}
                                                                <span className="text-[10px] font-medium text-gray-600">{sub.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {cat.orthoDetails && (
                                                        <div className="mt-4 p-3 bg-[var(--primary-light)] rounded-xl space-y-2">
                                                            <div className="flex justify-between text-[10px]">
                                                                <span className="text-[color:var(--primary)] opacity-80 font-bold uppercase">Lifetime Max</span>
                                                                <span className="text-[color:var(--primary-dark)] font-bold">${cat.orthoDetails.lifetimeMax}</span>
                                                            </div>
                                                            <div className="flex justify-between text-[10px]">
                                                                <span className="text-[color:var(--primary)] opacity-80 font-bold uppercase">Age Limit</span>
                                                                <span className="text-[color:var(--primary-dark)] font-bold">{cat.orthoDetails.ageLimit}</span>
                                                            </div>
                                                            <div className="flex justify-between text-[10px]">
                                                                <span className="text-[color:var(--primary)] opacity-80 font-bold uppercase">Work in Progress</span>
                                                                <span className="text-[color:var(--primary-dark)] font-bold">{cat.orthoDetails.workInProgress ? 'Yes' : 'No'}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* --- Section 4: Procedure Code Coverage --- */}
                            {insuranceSubTab === 3 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-[var(--primary-light)] rounded-lg text-[color:var(--primary)]">
                                                <Search size={18} />
                                            </div>
                                            <h3 className="font-bold text-gray-800">Procedure Code Coverage</h3>
                                        </div>
                                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                                            <Filter size={16} className="text-gray-400" />
                                            {categories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setCodeFilter(cat)}
                                                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${codeFilter === cat
                                                            ? 'bg-[var(--primary-light)] text-[color:var(--primary-dark)]'
                                                            : 'text-gray-400 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <th className="px-6 py-4">CDT Code</th>
                                                    <th className="px-6 py-4">Description</th>
                                                    <th className="px-6 py-4">Frequency / Interval</th>
                                                    <th className="px-6 py-4">Coverage</th>
                                                    <th className="px-6 py-4">Status</th>
                                                    <th className="px-6 py-4">Same Day</th>
                                                    <th className="px-6 py-4">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {filteredCodes.map((code) => (
                                                    <tr key={code.code} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm font-bold text-[color:var(--primary)]">{code.code}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-semibold text-gray-700">{code.description}</div>
                                                            <div className="text-[10px] text-gray-400 font-medium">{code.category}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-xs font-medium text-gray-600">{code.frequency}</div>
                                                            <div className="text-[10px] text-gray-400 italic">{code.interval}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className={`text-sm font-black ${getPercentageColor(code.percentage)}`}>
                                                                {code.percentage}%
                                                            </div>
                                                            <div className="text-[10px] text-gray-400">
                                                                {code.deductibleApplies ? 'Deductible Applies' : 'No Deductible'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Badge color={code.covered ? 'green' : 'red'}>
                                                                {code.covered ? 'Covered' : 'Not Covered'}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {code.txSameDay ? (
                                                                <CheckCircle2 size={16} className="text-green-500" />
                                                            ) : (
                                                                <XCircle size={16} className="text-gray-300" />
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-xs text-gray-500 max-w-[200px] truncate hover:whitespace-normal transition-all" title={code.notes}>
                                                                {code.notes}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* --- Section 5: Covered Members Table --- */}
                            {insuranceSubTab === 4 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-6 border-b border-gray-50">
                                        <SectionHeader title="Covered Members Service History" icon={User} />
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <th className="px-6 py-4 sticky left-0 bg-gray-50/50">Name / DOB</th>
                                                    <th className="px-6 py-4">Prophy</th>
                                                    <th className="px-6 py-4">FMD</th>
                                                    <th className="px-6 py-4">SRP</th>
                                                    <th className="px-6 py-4">FMX</th>
                                                    <th className="px-6 py-4">Pano</th>
                                                    <th className="px-6 py-4">BWX</th>
                                                    <th className="px-6 py-4">Regular Exam</th>
                                                    <th className="px-6 py-4">Emergency</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {COVERED_MEMBERS.map((member) => (
                                                    <tr key={member.name} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-gray-50/50">
                                                            <div className="text-sm font-bold text-gray-800">{member.name}</div>
                                                            <div className="text-[10px] text-gray-400">{member.dob}</div>
                                                        </td>
                                                        {[
                                                            member.prophy, member.fmd, member.srp, member.fmx,
                                                            member.pano, member.bwx, member.regularExam, member.emergencyExam
                                                        ].map((date, i) => (
                                                            <td key={i} className="px-6 py-4">
                                                                <span className={`text-xs font-medium ${date === 'N/A' ? 'text-gray-300' : 'text-gray-600'}`}>
                                                                    {date}
                                                                </span>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* --- Section 6: Verification Log --- */}
                            {insuranceSubTab === 5 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <SectionHeader title="Verification Log" icon={ShieldCheck} />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                                        <InfoItem label="Verified By" value={VERIFICATION_LOG.verifiedBy} />
                                        <InfoItem label="Date Verified" value={VERIFICATION_LOG.dateVerified} />
                                        <InfoItem label="Reference Number" value={VERIFICATION_LOG.referenceNumber} />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Verification Notes</span>
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-600 leading-relaxed">
                                            {VERIFICATION_LOG.notes}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <PatientModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingPatient(null);
                    }}
                    onSave={handleSavePatient}
                    patient={editingPatient}
                />
            </div>
        </div>
    );
}
