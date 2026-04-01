import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    User,
    Phone,
    Mail,
    Calendar,
    Clock,
    ShieldCheck,
    FileText,
    History,
    AlertCircle,
    ArrowRight,
    Printer,
    Download,
    ArrowLeft,
    Save,
    Plus,
    Filter,
    Search,
    Trash2,
    Info,
    RotateCcw,
    Check,
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

const buildDefaultInsuranceForm = () => ({
    subscriber_name: INSURANCE_PLAN.subscriberName || '',
    ssn_masked: INSURANCE_PLAN.ssnMasked || '',
    member_id: INSURANCE_PLAN.memberId || '',
    dob: INSURANCE_PLAN.dob || '',
    company: INSURANCE_PLAN.company || '',
    phone: INSURANCE_PLAN.phone || '',
    group_name: INSURANCE_PLAN.groupName || '',
    group_number: INSURANCE_PLAN.groupNumber || '',
    payer_id: INSURANCE_PLAN.payerId || '',
    effective_date: INSURANCE_PLAN.effectiveDate || '',
    email_fax: INSURANCE_PLAN.emailFax || '',
    timely_filing: INSURANCE_PLAN.timelyFiling || '',
    network_status: COVERAGE_DETAILS.networkStatus || '',
    fee_schedule: COVERAGE_DETAILS.feeSchedule || '',
    plan_year_type: COVERAGE_DETAILS.planYearType || '',
    plan_year_start: COVERAGE_DETAILS.planYearStart || '',
    plan_year_end: COVERAGE_DETAILS.planYearEnd || '',
    yearly_max: COVERAGE_DETAILS.yearlyMax || 0,
    yearly_max_used: COVERAGE_DETAILS.yearlyMaxUsed || 0,
    deductible_individual: COVERAGE_DETAILS.deductibleIndividual || 0,
    deductible_individual_met: COVERAGE_DETAILS.deductibleIndividualMet || 0,
    deductible_family: COVERAGE_DETAILS.deductibleFamily || 0,
    deductible_family_met: COVERAGE_DETAILS.deductibleFamilyMet || 0,
    coverage_type: COVERAGE_DETAILS.coverageType || '',
    dependent_age_limit: COVERAGE_DETAILS.dependentAgeLimit || '',
    cob_rule: COVERAGE_DETAILS.cobRule || '',
    waiting_period_has: Boolean(COVERAGE_DETAILS.waitingPeriod?.has),
    waiting_period_details: COVERAGE_DETAILS.waitingPeriod?.details || '',
    missing_tooth_clause_has: Boolean(COVERAGE_DETAILS.missingToothClause?.has),
    missing_tooth_clause_details: COVERAGE_DETAILS.missingToothClause?.details || '',
    po_box: COVERAGE_DETAILS.poBox || '',
    verified_by: VERIFICATION_LOG.verifiedBy || '',
    date_verified: VERIFICATION_LOG.dateVerified || '',
    reference_number: VERIFICATION_LOG.referenceNumber || '',
    verification_notes: VERIFICATION_LOG.notes || '',
    coverage_categories: COVERAGE_CATEGORIES,
    procedure_codes: PROCEDURE_CODES,
    covered_members: COVERED_MEMBERS,
});

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

/** refrence-InsuranceVerification — insurance tab */
const InsuranceRefBadge = ({ children, color }) => {
    const colors = {
        green: 'bg-green-100 text-green-700 border-green-200',
        red: 'bg-red-100 text-red-700 border-red-200',
        blue: 'bg-blue-100 text-blue-700 border-blue-200',
        amber: 'bg-amber-100 text-amber-700 border-amber-200',
        gray: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
            {children}
        </span>
    );
};

const InsuranceRefProgressBar = ({ value, max, label, color = 'bg-[var(--primary)]' }) => {
    const v = Number(value) || 0;
    const rawMax = Number(max) || 0;
    const percentage = rawMax > 0 ? Math.min(Math.round((v / rawMax) * 100), 100) : 0;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-gray-600">
                <span>{label}</span>
                <span>${v.toLocaleString()} / ${rawMax.toLocaleString()} ({rawMax > 0 ? `${percentage}%` : '—'})</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full ${color}`}
                />
            </div>
        </div>
    );
};

const InsuranceRefSectionHeader = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
        <div className="p-1.5 bg-[var(--primary-light)] rounded-lg text-[color:var(--primary)]">
            <Icon size={18} />
        </div>
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{title}</h3>
    </div>
);

const InsuranceRefInfoItem = ({
    label,
    value,
    icon: Icon,
    onChange,
    type = 'text',
}) => (
    <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        {onChange ? (
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 border border-transparent focus-within:border-[color:var(--primary)] focus-within:bg-white transition-all">
                {Icon && <Icon size={14} className="text-[color:var(--primary)] opacity-70 shrink-0" />}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full text-sm font-medium text-gray-700 bg-transparent outline-none"
                />
            </div>
        ) : (
            <div className="flex items-center gap-1.5">
                {Icon && <Icon size={14} className="text-[color:var(--primary)] opacity-70" />}
                <span className="text-sm font-medium text-gray-700">{value || 'N/A'}</span>
            </div>
        )}
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
    const [insuranceData, setInsuranceData] = useState(buildDefaultInsuranceForm());
    const [insuranceLoading, setInsuranceLoading] = useState(Boolean(routePatientId));
    const [insuranceSaving, setInsuranceSaving] = useState(false);
    const [insuranceSaveSuccess, setInsuranceSaveSuccess] = useState(false);
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

            refreshPatientData();
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

    const fetchPatientHeader = async () => {
        if (!routePatientId) return;
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
        if (!routePatientId) return;
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
        if (!routePatientId) return;
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

    const fetchInsuranceData = async () => {
        if (!routePatientId) return;
        try {
            const response = await patientsService.getInsurance(routePatientId);
            const apiInsurance = response?.data?.data;
            if (!apiInsurance) return;
            setInsuranceData((prev) => ({
                ...prev,
                ...apiInsurance,
                coverage_categories: Array.isArray(apiInsurance.coverage_categories) ? apiInsurance.coverage_categories : prev.coverage_categories,
                procedure_codes: Array.isArray(apiInsurance.procedure_codes) ? apiInsurance.procedure_codes : prev.procedure_codes,
                covered_members: Array.isArray(apiInsurance.covered_members) ? apiInsurance.covered_members : prev.covered_members,
            }));
        } catch (error) {
            console.error('fetchInsuranceData error =>', error?.message || error);
        } finally {
            setInsuranceLoading(false);
        }
    };

    const updateInsuranceField = (field, value) => {
        setInsuranceData((prev) => ({ ...prev, [field]: value }));
    };

    const updateInsuranceArrayItem = (arrayField, index, key, value) => {
        setInsuranceData((prev) => ({
            ...prev,
            [arrayField]: (prev[arrayField] || []).map((item, idx) => idx === index ? { ...item, [key]: value } : item),
        }));
    };

    const addInsuranceArrayItem = (arrayField, item) => {
        setInsuranceData((prev) => ({
            ...prev,
            [arrayField]: [...(prev[arrayField] || []), item],
        }));
    };

    const removeInsuranceArrayItem = (arrayField, index) => {
        setInsuranceData((prev) => ({
            ...prev,
            [arrayField]: (prev[arrayField] || []).filter((_, idx) => idx !== index),
        }));
    };

    const handleSaveInsurance = async () => {
        if (!routePatientId) return;
        try {
            setInsuranceSaving(true);
            setInsuranceSaveSuccess(false);
            await patientsService.updateInsurance(routePatientId, insuranceData);
            showToast('Insurance details updated successfully!', 'success');
            setInsuranceSaveSuccess(true);
            window.setTimeout(() => setInsuranceSaveSuccess(false), 3000);
        } catch (error) {
            console.error('handleSaveInsurance error =>', error);
            showToast(error?.response?.data?.message || error.message || 'Failed to update insurance details', 'error');
        } finally {
            setInsuranceSaving(false);
        }
    };

    const handleInsuranceReset = () => {
        if (!window.confirm('Are you sure you want to reset all insurance data to original values?')) return;
        setInsuranceData(buildDefaultInsuranceForm());
    };

    const addProcedureCode = () => {
        const newCode = {
            code: 'DXXXX',
            description: 'New Procedure',
            category: 'Other',
            frequency: 'N/A',
            interval: 'N/A',
            percentage: 0,
            deductibleApplies: true,
            covered: true,
            txSameDay: false,
            notes: '',
        };
        setInsuranceData((prev) => ({
            ...prev,
            procedure_codes: [...(prev.procedure_codes || []), newCode],
        }));
    };

    const deleteProcedureCode = (codeStr) => {
        setInsuranceData((prev) => ({
            ...prev,
            procedure_codes: (prev.procedure_codes || []).filter((c) => c.code !== codeStr),
        }));
    };

    const addCoveredMember = () => {
        addInsuranceArrayItem('covered_members', {
            name: 'New Member',
            dob: '',
            prophy: 'N/A',
            fmd: 'N/A',
            srp: 'N/A',
            fmx: 'N/A',
            pano: 'N/A',
            bwx: 'N/A',
            regularExam: 'N/A',
            emergencyExam: 'N/A',
        });
    };

    const deleteCoveredMember = (idx) => {
        removeInsuranceArrayItem('covered_members', idx);
    };

    const addCategory = () => {
        addInsuranceArrayItem('coverage_categories', {
            category: 'New Category',
            percentage: 0,
            deductibleApplies: true,
            restorative: false,
            endo: false,
            perio: false,
            oralSurgery: false,
        });
    };

    const deleteCategory = (idx) => {
        removeInsuranceArrayItem('coverage_categories', idx);
    };

    const refreshPatientData = async () => {
        if (!routePatientId) return;
        setPatientLoading(true);
        setUpcomingLoading(true);
        setHistoryLoading(true);
        setInsuranceLoading(true);

        await Promise.allSettled([
            fetchPatientHeader(),
            fetchUpcomingVisit(),
            fetchHistoryVisits(),
            fetchInsuranceData(),
        ]);
    };

    useEffect(() => {
        if (!routePatientId) return;
        refreshPatientData();
    }, [routePatientId]);

    const procedureCodeCategories = useMemo(() => {
        const codes = insuranceData.procedure_codes || [];
        return ['All', ...new Set(codes.map((c) => c.category).filter(Boolean))];
    }, [insuranceData.procedure_codes]);

    const filteredProcedureCodes = useMemo(() => {
        const codes = insuranceData.procedure_codes || [];
        if (codeFilter === 'All') return codes;
        return codes.filter((code) => code.category === codeFilter);
    }, [codeFilter, insuranceData.procedure_codes]);

    useEffect(() => {
        if (procedureCodeCategories.includes(codeFilter)) return;
        setCodeFilter('All');
    }, [procedureCodeCategories, codeFilter]);
    const hasUpcomingVisits = upcomingVisits.length > 0;

    const getPercentageColor = (pct) => {
        if (pct === 100) return 'text-green-600';
        if (pct >= 80) return 'text-blue-600';
        if (pct >= 50) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div className="h-full min-h-0 overflow-y-auto bg-[#F8F9FC] text-gray-900 font-sans px-3 py-4 md:px-6 md:py-6 lg:px-8">
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
                            <p className="text-sm text-gray-500 font-medium mt-1 flex gap-2">
                                {patientLoading
                                    ? 'Fetching patient details...'
                                    : (
                                        <>
                                            Patients ID: {patientData.member_id || 'N/A'}
                                            {/* {routePatientId ? ` • Route: ${routePatientId}` : ''} */}
                                            <span className="text-gray-500">• DOB: {patientData.dob || 'N/A'}</span>
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
                                            {upcomingLoading ? 'Loading...' : `Confirmed`}
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
                                        <Link to={`/calendar`} className="flex items-center gap-2 w-full py-2.5 bg-[var(--primary-light)] text-[color:var(--primary)] rounded-xl text-sm font-bold hover:brightness-[0.97] transition-colors flex items-center justify-center gap-2"><span>Reschedule</span><ArrowRight size={16} /></Link>
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
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[var(--primary-light)] rounded-xl text-[color:var(--primary)]">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800">Insurance Verification</h2>
                                        <p className="text-xs text-gray-500">Manage and update patient insurance details</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <button
                                        type="button"
                                        onClick={handleInsuranceReset}
                                        disabled={insuranceLoading}
                                        className="flex-1 md:flex-none px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 border border-gray-200 disabled:opacity-50"
                                    >
                                        <RotateCcw size={16} />
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveInsurance}
                                        disabled={insuranceSaving || insuranceLoading}
                                        className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${insuranceSaveSuccess
                                            ? 'bg-green-600 text-white shadow-green-100'
                                            : 'bg-[var(--primary)] text-white shadow-[0_6px_20px_-6px_var(--primary-light)] hover:bg-[var(--primary-dark)]'
                                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                                    >
                                        {insuranceSaving ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : insuranceSaveSuccess ? (
                                            <Check size={16} />
                                        ) : (
                                            <Save size={16} />
                                        )}
                                        {insuranceSaveSuccess ? 'Saved!' : insuranceSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>

                            {insuranceLoading && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-sm text-gray-500 flex items-center gap-3">
                                    <i className="fas fa-spinner fa-spin text-[color:var(--primary)]" />
                                    Loading insurance details...
                                </div>
                            )}

                            {!insuranceLoading && (
                                <>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {['General Info', 'Coverage Details', 'Categories', 'Procedure Codes', 'Members', 'Log'].map((label, idx) => (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => setInsuranceSubTab(idx)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${insuranceSubTab === idx
                                                    ? 'bg-[var(--primary)] text-white border-[color:var(--primary)] shadow-md shadow-[0_6px_20px_-6px_var(--primary-light)]'
                                                    : 'bg-white text-gray-500 border-gray-100 hover:border-[color:var(--primary-light)] hover:text-[color:var(--primary)]'
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                {insuranceSubTab === 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <InsuranceRefSectionHeader title="Patient & Plan Information" icon={User} />
                                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                            <InsuranceRefInfoItem label="Subscriber Name" value={insuranceData.subscriber_name} onChange={(val) => updateInsuranceField('subscriber_name', val)} />
                                            <InsuranceRefInfoItem label="Social Security #" value={insuranceData.ssn_masked} onChange={(val) => updateInsuranceField('ssn_masked', val)} />
                                            <InsuranceRefInfoItem label="Member ID" value={insuranceData.member_id} onChange={(val) => updateInsuranceField('member_id', val)} />
                                            <InsuranceRefInfoItem label="Date of Birth" value={insuranceData.dob} type="date" onChange={(val) => updateInsuranceField('dob', val)} />
                                            <InsuranceRefInfoItem label="Insurance Company" value={insuranceData.company} onChange={(val) => updateInsuranceField('company', val)} />
                                            <InsuranceRefInfoItem label="Insurance Phone" value={insuranceData.phone} icon={Phone} onChange={(val) => updateInsuranceField('phone', val)} />
                                            <InsuranceRefInfoItem label="Group Name" value={insuranceData.group_name} onChange={(val) => updateInsuranceField('group_name', val)} />
                                            <InsuranceRefInfoItem label="Group Number" value={insuranceData.group_number} onChange={(val) => updateInsuranceField('group_number', val)} />
                                            <InsuranceRefInfoItem label="Payer ID" value={insuranceData.payer_id} onChange={(val) => updateInsuranceField('payer_id', val)} />
                                            <InsuranceRefInfoItem label="Effective Date" value={insuranceData.effective_date} type="date" onChange={(val) => updateInsuranceField('effective_date', val)} />
                                            <InsuranceRefInfoItem label="Email / Fax" value={insuranceData.email_fax} icon={Mail} onChange={(val) => updateInsuranceField('email_fax', val)} />
                                            <InsuranceRefInfoItem label="Timely Filing" value={insuranceData.timely_filing} onChange={(val) => updateInsuranceField('timely_filing', val)} />
                                        </div>
                                    </div>
                                )}

                                {insuranceSubTab === 1 && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                            <InsuranceRefSectionHeader title="Plan Limits & Deductibles" icon={AlertCircle} />
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <InsuranceRefInfoItem label="Yearly Max ($)" value={insuranceData.yearly_max} type="number" onChange={(val) => updateInsuranceField('yearly_max', Number(val))} />
                                                    <InsuranceRefInfoItem label="Yearly Max Used ($)" value={insuranceData.yearly_max_used} type="number" onChange={(val) => updateInsuranceField('yearly_max_used', Number(val))} />
                                                </div>
                                                <InsuranceRefProgressBar
                                                    label="Yearly Maximum Progress"
                                                    value={Number(insuranceData.yearly_max_used) || 0}
                                                    max={Number(insuranceData.yearly_max) || 0}
                                                />
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <InsuranceRefInfoItem label="Indiv. Ded. ($)" value={insuranceData.deductible_individual} type="number" onChange={(val) => updateInsuranceField('deductible_individual', Number(val))} />
                                                            <InsuranceRefInfoItem label="Met ($)" value={insuranceData.deductible_individual_met} type="number" onChange={(val) => updateInsuranceField('deductible_individual_met', Number(val))} />
                                                        </div>
                                                        <InsuranceRefProgressBar
                                                            label="Individual Deductible"
                                                            value={Number(insuranceData.deductible_individual_met) || 0}
                                                            max={Number(insuranceData.deductible_individual) || 0}
                                                            color="bg-amber-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <InsuranceRefInfoItem label="Family Ded. ($)" value={insuranceData.deductible_family} type="number" onChange={(val) => updateInsuranceField('deductible_family', Number(val))} />
                                                            <InsuranceRefInfoItem label="Met ($)" value={insuranceData.deductible_family_met} type="number" onChange={(val) => updateInsuranceField('deductible_family_met', Number(val))} />
                                                        </div>
                                                        <InsuranceRefProgressBar
                                                            label="Family Deductible"
                                                            value={Number(insuranceData.deductible_family_met) || 0}
                                                            max={Number(insuranceData.deductible_family) || 0}
                                                            color="bg-amber-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-8 grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Network Status</span>
                                                    <select
                                                        value={insuranceData.network_status || 'In-Network'}
                                                        onChange={(e) => updateInsuranceField('network_status', e.target.value)}
                                                        className="bg-gray-50 rounded-lg px-2 py-1.5 border border-transparent focus:border-[color:var(--primary-light)] focus:bg-white text-sm font-medium text-gray-700 outline-none"
                                                    >
                                                        <option value="In-Network">In-Network</option>
                                                        <option value="Out-of-Network">Out-of-Network</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Fee Schedule</span>
                                                    <select
                                                        value={insuranceData.fee_schedule || 'PPO'}
                                                        onChange={(e) => updateInsuranceField('fee_schedule', e.target.value)}
                                                        className="bg-gray-50 rounded-lg px-2 py-1.5 border border-transparent focus:border-[color:var(--primary-light)] focus:bg-white text-sm font-medium text-gray-700 outline-none"
                                                    >
                                                        <option value="PPO">PPO</option>
                                                        <option value="UCR">UCR</option>
                                                        <option value="Indemnity">Indemnity</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Plan Year Type</span>
                                                    <select
                                                        value={insuranceData.plan_year_type || 'Calendar Year'}
                                                        onChange={(e) => updateInsuranceField('plan_year_type', e.target.value)}
                                                        className="bg-gray-50 rounded-lg px-2 py-1.5 border border-transparent focus:border-[color:var(--primary-light)] focus:bg-white text-sm font-medium text-gray-700 outline-none"
                                                    >
                                                        <option value="Calendar Year">Calendar Year</option>
                                                        <option value="Plan Year">Plan Year</option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <InsuranceRefInfoItem label="Start" value={insuranceData.plan_year_start} type="date" onChange={(val) => updateInsuranceField('plan_year_start', val)} />
                                                    <InsuranceRefInfoItem label="End" value={insuranceData.plan_year_end} type="date" onChange={(val) => updateInsuranceField('plan_year_end', val)} />
                                                </div>
                                                <InsuranceRefInfoItem label="Coverage Type" value={insuranceData.coverage_type} onChange={(val) => updateInsuranceField('coverage_type', val)} />
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                            <InsuranceRefSectionHeader title="Rules & Clauses" icon={Info} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <InsuranceRefInfoItem label="Dependent Age Limit" value={insuranceData.dependent_age_limit ?? ''} type="number" onChange={(val) => updateInsuranceField('dependent_age_limit', val === '' ? null : Number(val))} />
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">COB Rule</span>
                                                    <select
                                                        value={insuranceData.cob_rule || 'Standard'}
                                                        onChange={(e) => updateInsuranceField('cob_rule', e.target.value)}
                                                        className="bg-gray-50 rounded-lg px-2 py-1.5 border border-transparent focus:border-[color:var(--primary-light)] focus:bg-white text-sm font-medium text-gray-700 outline-none"
                                                    >
                                                        <option value="Standard">Standard</option>
                                                        <option value="Birthday Rule">Birthday Rule</option>
                                                        <option value="Non-Duplication">Non-Duplication</option>
                                                        <option value="N/A">N/A</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-full space-y-4">
                                                    <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Waiting Period</span>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <span className="text-xs font-medium text-gray-600">Has Waiting Period</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(insuranceData.waiting_period_has)}
                                                                    onChange={(e) => updateInsuranceField('waiting_period_has', e.target.checked)}
                                                                    className="w-4 h-4 text-[color:var(--primary)] rounded focus:ring-[color:var(--primary)]"
                                                                />
                                                            </label>
                                                        </div>
                                                        <input
                                                            value={insuranceData.waiting_period_details || ''}
                                                            onChange={(e) => updateInsuranceField('waiting_period_details', e.target.value)}
                                                            className="w-full text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[color:var(--primary-light)]"
                                                            placeholder="Details..."
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Missing Tooth Clause</span>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <span className="text-xs font-medium text-gray-600">Has Clause</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(insuranceData.missing_tooth_clause_has)}
                                                                    onChange={(e) => updateInsuranceField('missing_tooth_clause_has', e.target.checked)}
                                                                    className="w-4 h-4 text-[color:var(--primary)] rounded focus:ring-[color:var(--primary)]"
                                                                />
                                                            </label>
                                                        </div>
                                                        <input
                                                            value={insuranceData.missing_tooth_clause_details || ''}
                                                            onChange={(e) => updateInsuranceField('missing_tooth_clause_details', e.target.value)}
                                                            className="w-full text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[color:var(--primary-light)]"
                                                            placeholder="Details..."
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-full">
                                                    <InsuranceRefInfoItem label="P.O. Box Address" value={insuranceData.po_box} onChange={(val) => updateInsuranceField('po_box', val)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {insuranceSubTab === 2 && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-[var(--primary-light)] rounded-lg text-[color:var(--primary)]">
                                                    <Filter size={18} />
                                                </div>
                                                <h3 className="font-bold text-gray-800">Coverage Categories</h3>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addCategory}
                                                className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--primary-dark)] transition-all flex items-center gap-2 shadow-md shadow-[0_6px_20px_-6px_var(--primary-light)]"
                                            >
                                                <Plus size={18} />
                                                Add Category
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {(insuranceData.coverage_categories || []).map((cat, idx) => (
                                                <div key={`${cat.category}-${idx}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow relative group">
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteCategory(idx)}
                                                        className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                    <div className="flex items-start gap-3 mb-4">
                                                        <input
                                                            value={cat.category}
                                                            onChange={(e) => {
                                                                const newCats = [...(insuranceData.coverage_categories || [])];
                                                                newCats[idx] = { ...newCats[idx], category: e.target.value };
                                                                setInsuranceData((prev) => ({ ...prev, coverage_categories: newCats }));
                                                            }}
                                                            className="min-w-0 flex-1 font-bold text-gray-800 bg-transparent outline-none border-b border-transparent focus:border-[color:var(--primary-light)]"
                                                        />
                                                        <div className="inline-flex shrink-0 items-baseline gap-0">
                                                            <input
                                                                type="number"
                                                                value={cat.percentage}
                                                                onChange={(e) => {
                                                                    const newCats = [...(insuranceData.coverage_categories || [])];
                                                                    newCats[idx] = { ...newCats[idx], percentage: Number(e.target.value) };
                                                                    setInsuranceData((prev) => ({ ...prev, coverage_categories: newCats }));
                                                                }}
                                                                className={`w-[2.75rem] max-w-[3.5rem] border-0 bg-transparent p-0 text-right text-2xl font-black leading-none outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${getPercentageColor(cat.percentage)}`}
                                                            />
                                                            <span className={`pl-0.5 text-2xl font-black leading-none ${getPercentageColor(cat.percentage)}`}>%</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-gray-400 font-medium">Deductible Applies</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={cat.deductibleApplies}
                                                                onChange={(e) => {
                                                                    const newCats = [...(insuranceData.coverage_categories || [])];
                                                                    newCats[idx] = { ...newCats[idx], deductibleApplies: e.target.checked };
                                                                    setInsuranceData((prev) => ({ ...prev, coverage_categories: newCats }));
                                                                }}
                                                                className="w-4 h-4 text-[color:var(--primary)] rounded focus:ring-[color:var(--primary)]"
                                                            />
                                                        </div>
                                                        <div className="pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
                                                            {[
                                                                { label: 'Restorative', key: 'restorative' },
                                                                { label: 'Endo', key: 'endo' },
                                                                { label: 'Perio', key: 'perio' },
                                                                { label: 'Oral Surgery', key: 'oralSurgery' },
                                                            ].map((sub) => (
                                                                <label key={sub.key} className="flex items-center gap-1.5 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(cat[sub.key])}
                                                                        onChange={(e) => {
                                                                            const newCats = [...(insuranceData.coverage_categories || [])];
                                                                            newCats[idx] = { ...newCats[idx], [sub.key]: e.target.checked };
                                                                            setInsuranceData((prev) => ({ ...prev, coverage_categories: newCats }));
                                                                        }}
                                                                        className="w-3 h-3 text-[color:var(--primary)] rounded focus:ring-[color:var(--primary)]"
                                                                    />
                                                                    <span className="text-[10px] font-medium text-gray-600">{sub.label}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        {cat.orthoDetails && (
                                                            <div className="mt-4 p-3 bg-[var(--primary-light)] rounded-xl space-y-2">
                                                                <div className="flex justify-between items-center text-[10px]">
                                                                    <span className="text-[color:var(--primary)] opacity-70 font-bold uppercase">Lifetime Max</span>
                                                                    <input
                                                                        type="number"
                                                                        value={cat.orthoDetails.lifetimeMax}
                                                                        onChange={(e) => {
                                                                            const newCats = [...(insuranceData.coverage_categories || [])];
                                                                            newCats[idx] = {
                                                                                ...newCats[idx],
                                                                                orthoDetails: {
                                                                                    ...newCats[idx].orthoDetails,
                                                                                    lifetimeMax: Number(e.target.value),
                                                                                },
                                                                            };
                                                                            setInsuranceData((prev) => ({ ...prev, coverage_categories: newCats }));
                                                                        }}
                                                                        className="w-16 bg-transparent border-b border-[color:var(--primary-light)] text-[color:var(--primary-dark)] font-bold text-right outline-none"
                                                                    />
                                                                </div>
                                                                <div className="flex justify-between items-center text-[10px]">
                                                                    <span className="text-[color:var(--primary)] opacity-70 font-bold uppercase">Age Limit</span>
                                                                    <input
                                                                        type="number"
                                                                        value={cat.orthoDetails.ageLimit}
                                                                        onChange={(e) => {
                                                                            const newCats = [...(insuranceData.coverage_categories || [])];
                                                                            newCats[idx] = {
                                                                                ...newCats[idx],
                                                                                orthoDetails: {
                                                                                    ...newCats[idx].orthoDetails,
                                                                                    ageLimit: Number(e.target.value),
                                                                                },
                                                                            };
                                                                            setInsuranceData((prev) => ({ ...prev, coverage_categories: newCats }));
                                                                        }}
                                                                        className="w-16 bg-transparent border-b border-[color:var(--primary-light)] text-[color:var(--primary-dark)] font-bold text-right outline-none"
                                                                    />
                                                                </div>
                                                                <div className="flex justify-between items-center text-[10px]">
                                                                    <span className="text-[color:var(--primary)] opacity-70 font-bold uppercase">Work in Progress</span>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={cat.orthoDetails.workInProgress}
                                                                        onChange={(e) => {
                                                                            const newCats = [...(insuranceData.coverage_categories || [])];
                                                                            newCats[idx] = {
                                                                                ...newCats[idx],
                                                                                orthoDetails: {
                                                                                    ...newCats[idx].orthoDetails,
                                                                                    workInProgress: e.target.checked,
                                                                                },
                                                                            };
                                                                            setInsuranceData((prev) => ({ ...prev, coverage_categories: newCats }));
                                                                        }}
                                                                        className="w-3 h-3 text-[color:var(--primary)] rounded focus:ring-[color:var(--primary)]"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {insuranceSubTab === 3 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-[var(--primary-light)] rounded-lg text-[color:var(--primary)]">
                                                        <Search size={18} />
                                                    </div>
                                                    <h3 className="font-bold text-gray-800">Procedure Code Coverage</h3>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={addProcedureCode}
                                                    className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs font-bold hover:bg-[var(--primary-dark)] transition-all flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <Plus size={14} />
                                                    Add Code
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                                                <Filter size={16} className="text-gray-400 shrink-0" />
                                                {procedureCodeCategories.map((cat) => (
                                                    <button
                                                        key={cat}
                                                        type="button"
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
                                                        <th className="px-6 py-4 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {filteredProcedureCodes.map((code, rowIdx) => (
                                                        <tr key={`proc-${rowIdx}-${code.code}`} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <input
                                                                    value={code.code}
                                                                    onChange={(e) => {
                                                                        const newCodes = [...(insuranceData.procedure_codes || [])];
                                                                        const targetIdx = newCodes.findIndex((c) => c.code === code.code);
                                                                        if (targetIdx === -1) return;
                                                                        newCodes[targetIdx] = { ...newCodes[targetIdx], code: e.target.value };
                                                                        setInsuranceData((prev) => ({ ...prev, procedure_codes: newCodes }));
                                                                    }}
                                                                    className="w-16 text-sm font-bold text-[color:var(--primary)] bg-transparent outline-none focus:border-b border-[color:var(--primary-light)]"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <input
                                                                    value={code.description}
                                                                    onChange={(e) => {
                                                                        const newCodes = [...(insuranceData.procedure_codes || [])];
                                                                        const targetIdx = newCodes.findIndex((c) => c.code === code.code);
                                                                        if (targetIdx === -1) return;
                                                                        newCodes[targetIdx] = { ...newCodes[targetIdx], description: e.target.value };
                                                                        setInsuranceData((prev) => ({ ...prev, procedure_codes: newCodes }));
                                                                    }}
                                                                    className="w-full text-sm font-semibold text-gray-700 bg-transparent outline-none focus:border-b border-gray-200"
                                                                />
                                                                <div className="text-[10px] text-gray-400 font-medium">{code.category}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <input
                                                                    value={code.frequency}
                                                                    onChange={(e) => {
                                                                        const newCodes = [...(insuranceData.procedure_codes || [])];
                                                                        const targetIdx = newCodes.findIndex((c) => c.code === code.code);
                                                                        if (targetIdx === -1) return;
                                                                        newCodes[targetIdx] = { ...newCodes[targetIdx], frequency: e.target.value };
                                                                        setInsuranceData((prev) => ({ ...prev, procedure_codes: newCodes }));
                                                                    }}
                                                                    className="w-full text-xs font-medium text-gray-600 bg-transparent outline-none focus:border-b border-gray-200"
                                                                />
                                                                <input
                                                                    value={code.interval}
                                                                    onChange={(e) => {
                                                                        const newCodes = [...(insuranceData.procedure_codes || [])];
                                                                        const targetIdx = newCodes.findIndex((c) => c.code === code.code);
                                                                        if (targetIdx === -1) return;
                                                                        newCodes[targetIdx] = { ...newCodes[targetIdx], interval: e.target.value };
                                                                        setInsuranceData((prev) => ({ ...prev, procedure_codes: newCodes }));
                                                                    }}
                                                                    className="w-full text-[10px] text-gray-400 italic bg-transparent outline-none focus:border-b border-gray-200"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type="number"
                                                                        value={code.percentage}
                                                                        onChange={(e) => {
                                                                            const newCodes = [...(insuranceData.procedure_codes || [])];
                                                                            const targetIdx = newCodes.findIndex((c) => c.code === code.code);
                                                                            if (targetIdx === -1) return;
                                                                            newCodes[targetIdx] = { ...newCodes[targetIdx], percentage: Number(e.target.value) };
                                                                            setInsuranceData((prev) => ({ ...prev, procedure_codes: newCodes }));
                                                                        }}
                                                                        className={`w-8 text-sm font-black bg-transparent outline-none text-right ${getPercentageColor(code.percentage)}`}
                                                                    />
                                                                    <span className={`text-sm font-black ${getPercentageColor(code.percentage)}`}>%</span>
                                                                </div>
                                                                <label className="flex items-center gap-1 mt-1 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={code.deductibleApplies}
                                                                        onChange={(e) => {
                                                                            const newCodes = [...(insuranceData.procedure_codes || [])];
                                                                            const targetIdx = newCodes.findIndex((c) => c.code === code.code);
                                                                            if (targetIdx === -1) return;
                                                                            newCodes[targetIdx] = { ...newCodes[targetIdx], deductibleApplies: e.target.checked };
                                                                            setInsuranceData((prev) => ({ ...prev, procedure_codes: newCodes }));
                                                                        }}
                                                                        className="w-3 h-3 text-[color:var(--primary)] rounded focus:ring-[color:var(--primary)]"
                                                                    />
                                                                    <span className="text-[10px] text-gray-400">Ded.</span>
                                                                </label>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newCodes = [...(insuranceData.procedure_codes || [])];
                                                                        const targetIdx = newCodes.findIndex((c) => c.code === code.code);
                                                                        if (targetIdx === -1) return;
                                                                        newCodes[targetIdx] = { ...newCodes[targetIdx], covered: !newCodes[targetIdx].covered };
                                                                        setInsuranceData((prev) => ({ ...prev, procedure_codes: newCodes }));
                                                                    }}
                                                                    className="outline-none"
                                                                >
                                                                    <InsuranceRefBadge color={code.covered ? 'green' : 'red'}>
                                                                        {code.covered ? 'Covered' : 'Not Covered'}
                                                                    </InsuranceRefBadge>
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={code.txSameDay}
                                                                    onChange={(e) => {
                                                                        const newCodes = [...(insuranceData.procedure_codes || [])];
                                                                        const targetIdx = newCodes.findIndex((c) => c.code === code.code);
                                                                        if (targetIdx === -1) return;
                                                                        newCodes[targetIdx] = { ...newCodes[targetIdx], txSameDay: e.target.checked };
                                                                        setInsuranceData((prev) => ({ ...prev, procedure_codes: newCodes }));
                                                                    }}
                                                                    className="w-4 h-4 text-[color:var(--primary)] rounded focus:ring-[color:var(--primary)]"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <input
                                                                    value={code.notes}
                                                                    onChange={(e) => {
                                                                        const newCodes = [...(insuranceData.procedure_codes || [])];
                                                                        const targetIdx = newCodes.findIndex((c) => c.code === code.code);
                                                                        if (targetIdx === -1) return;
                                                                        newCodes[targetIdx] = { ...newCodes[targetIdx], notes: e.target.value };
                                                                        setInsuranceData((prev) => ({ ...prev, procedure_codes: newCodes }));
                                                                    }}
                                                                    className="w-full text-xs text-gray-500 bg-transparent outline-none focus:border-b border-gray-200"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteProcedureCode(code.code)}
                                                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {insuranceSubTab === 4 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                                            <InsuranceRefSectionHeader title="Covered Members Service History" icon={User} />
                                            <button
                                                type="button"
                                                onClick={addCoveredMember}
                                                className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs font-bold hover:bg-[var(--primary-dark)] transition-all flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Plus size={14} />
                                                Add Member
                                            </button>
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
                                                        <th className="px-6 py-4 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {(insuranceData.covered_members || []).map((member, mIdx) => (
                                                        <tr key={mIdx} className="group hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-gray-50/50">
                                                                <input
                                                                    value={member.name}
                                                                    onChange={(e) => {
                                                                        const newMembers = [...(insuranceData.covered_members || [])];
                                                                        newMembers[mIdx] = { ...newMembers[mIdx], name: e.target.value };
                                                                        setInsuranceData((prev) => ({ ...prev, covered_members: newMembers }));
                                                                    }}
                                                                    className="text-sm font-bold text-gray-800 bg-transparent outline-none focus:border-b border-gray-200"
                                                                />
                                                                <input
                                                                    type="date"
                                                                    value={member.dob}
                                                                    onChange={(e) => {
                                                                        const newMembers = [...(insuranceData.covered_members || [])];
                                                                        newMembers[mIdx] = { ...newMembers[mIdx], dob: e.target.value };
                                                                        setInsuranceData((prev) => ({ ...prev, covered_members: newMembers }));
                                                                    }}
                                                                    className="text-[10px] text-gray-400 bg-transparent outline-none block"
                                                                />
                                                            </td>
                                                            {[
                                                                { key: 'prophy', val: member.prophy },
                                                                { key: 'fmd', val: member.fmd },
                                                                { key: 'srp', val: member.srp },
                                                                { key: 'fmx', val: member.fmx },
                                                                { key: 'pano', val: member.pano },
                                                                { key: 'bwx', val: member.bwx },
                                                                { key: 'regularExam', val: member.regularExam },
                                                                { key: 'emergencyExam', val: member.emergencyExam },
                                                            ].map((field) => {
                                                                const str = field.val == null ? '' : String(field.val).trim();
                                                                const isEmpty = str === '';
                                                                const isNA = str === 'N/A' || str === 'n/a';
                                                                return (
                                                                    <td key={field.key} className="px-6 py-4">
                                                                        <input
                                                                            value={isEmpty ? '' : field.val}
                                                                            placeholder="N/A"
                                                                            onChange={(e) => {
                                                                                const newMembers = [...(insuranceData.covered_members || [])];
                                                                                newMembers[mIdx] = { ...newMembers[mIdx], [field.key]: e.target.value };
                                                                                setInsuranceData((prev) => ({ ...prev, covered_members: newMembers }));
                                                                            }}
                                                                            className={`w-24 text-xs font-medium bg-transparent outline-none focus:border-b border-gray-200 placeholder:text-gray-300 ${isNA ? 'text-gray-300' : 'text-gray-600'}`}
                                                                        />
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteCoveredMember(mIdx)}
                                                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {insuranceSubTab === 5 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <InsuranceRefSectionHeader title="Verification Log" icon={ShieldCheck} />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                                            <InsuranceRefInfoItem label="Verified By" value={insuranceData.verified_by} onChange={(val) => updateInsuranceField('verified_by', val)} />
                                            <InsuranceRefInfoItem label="Date Verified" value={insuranceData.date_verified} type="date" onChange={(val) => updateInsuranceField('date_verified', val)} />
                                            <InsuranceRefInfoItem label="Reference Number" value={insuranceData.reference_number} onChange={(val) => updateInsuranceField('reference_number', val)} />
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Verification Notes</span>
                                            <textarea
                                                value={insuranceData.verification_notes || ''}
                                                onChange={(e) => updateInsuranceField('verification_notes', e.target.value)}
                                                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm text-gray-600 leading-relaxed outline-none focus:border-[color:var(--primary-light)] focus:bg-white transition-all min-h-[120px]"
                                            />
                                        </div>
                                    </div>
                                )}
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <PatientModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingPatient(null);
                        refreshPatientData();
                    }}
                    onSave={handleSavePatient}
                    patient={editingPatient}
                />
            </div>
        </div>
    );
}
