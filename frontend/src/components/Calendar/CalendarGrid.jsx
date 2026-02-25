import { useState, useMemo } from 'react';

// ─── Constants ─────────────────────────────────
const HOUR_HEIGHT = 60;
const START_HOUR = 0;
const END_HOUR = 24;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const DOCTOR_COLORS = [
    '#6f2ac3', '#2563EB', '#059669', '#D97706', '#DC2626',
    '#7C3AED', '#0891B2', '#BE185D', '#4F46E5', '#15803D',
];

// ─── Helpers ───────────────────────────────────
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return 0;
    let [, h, m, period] = match;
    h = parseInt(h, 10);
    m = parseInt(m, 10);
    if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
};

const formatDateLabel = (date) =>
    date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const formatMonthYear = (date) =>
    date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

const getWeekDays = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
};

const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;

    const days = [];
    for (let i = startOffset - 1; i >= 0; i--) {
        days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
};

const getDoctorColor = (doctorId, doctorMap) => {
    const doctors = Object.keys(doctorMap);
    const idx = doctors.indexOf(String(doctorId));
    return DOCTOR_COLORS[idx >= 0 ? idx % DOCTOR_COLORS.length : 0];
};

const formatHourLabel = (h) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
};

// ─── Appointment Card ──────────────────────────
const AppointmentCard = ({ appt, doctorName, color, onClick, style }) => {
    const patientName = appt.patient_details?.name || 'Patient';
    return (
        <div
            className="cal-appt-card"
            style={{ ...style, borderLeftColor: color }}
            onClick={(e) => { e.stopPropagation(); onClick(appt); }}
            title={`${doctorName} • ${patientName}\n${appt.from} – ${appt.to}`}
        >
            <div className="cal-appt-doctor">{doctorName}</div>
            <div className="cal-appt-patient">{patientName}</div>
        </div>
    );
};

const DayView = ({ date, appointments, doctorMap, onAppointmentClick }) => {
    const dayAppts = appointments.filter(a => {
        const d = new Date(a.meeting_date + 'T00:00:00');
        return isSameDay(d, date);
    });

    return (
        <div className="cal-day-view">
            <div className="cal-day-header">
                <div className="cal-time-gutter-header"></div>
                <div className="cal-day-col-header">
                    <span className="cal-day-name">{date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                    <span className={`cal-day-number ${isSameDay(date, new Date()) ? 'cal-today' : ''}`}>
                        {date.getDate()}
                    </span>
                </div>
            </div>
            <div className="cal-time-grid custom-scrollbar">
                <div className="cal-time-grid-inner" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                    <div className="cal-time-gutter">
                        {HOURS.map(h => (
                            <div key={h} className="cal-time-slot" style={{ height: HOUR_HEIGHT }}>
                                <span>{formatHourLabel(h)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="cal-day-column">
                        {HOURS.map(h => (
                            <div key={h} className="cal-hour-line" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                        ))}
                        {dayAppts.map(appt => {
                            const fromMin = parseTimeToMinutes(appt.from);
                            const toMin = parseTimeToMinutes(appt.to);
                            const top = ((fromMin / 60) - START_HOUR) * HOUR_HEIGHT;
                            const height = Math.max(((toMin - fromMin) / 60) * HOUR_HEIGHT, 28);
                            const doctorName = doctorMap[appt.doctor_id] || 'Doctor';
                            const color = getDoctorColor(appt.doctor_id, doctorMap);
                            return (
                                <AppointmentCard
                                    key={appt.id}
                                    appt={appt}
                                    doctorName={doctorName}
                                    color={color}
                                    onClick={onAppointmentClick}
                                    style={{ position: 'absolute', top, height, left: 4, right: 4 }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Week View ─────────────────────────────────
const WeekView = ({ date, appointments, doctorMap, onAppointmentClick }) => {
    const weekDays = useMemo(() => getWeekDays(date), [date]);

    return (
        <div className="cal-week-view">
            <div className="cal-week-header">
                <div className="cal-time-gutter-header"></div>
                {weekDays.map((d, i) => (
                    <div key={i} className="cal-week-col-header">
                        <span className="cal-day-name">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className={`cal-day-number ${isSameDay(d, new Date()) ? 'cal-today' : ''}`}>
                            {d.getDate()}
                        </span>
                    </div>
                ))}
            </div>
            <div className="cal-time-grid custom-scrollbar">
                <div className="cal-time-grid-inner" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                    <div className="cal-time-gutter">
                        {HOURS.map(h => (
                            <div key={h} className="cal-time-slot" style={{ height: HOUR_HEIGHT }}>
                                <span>{formatHourLabel(h)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="cal-week-columns">
                        {weekDays.map((day, colIdx) => {
                            const dayAppts = appointments.filter(a => {
                                const d = new Date(a.meeting_date + 'T00:00:00');
                                return isSameDay(d, day);
                            });
                            return (
                                <div key={colIdx} className="cal-week-column">
                                    {HOURS.map(h => (
                                        <div key={h} className="cal-hour-line" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                                    ))}
                                    {dayAppts.map(appt => {
                                        const fromMin = parseTimeToMinutes(appt.from);
                                        const toMin = parseTimeToMinutes(appt.to);
                                        const top = ((fromMin / 60) - START_HOUR) * HOUR_HEIGHT;
                                        const height = Math.max(((toMin - fromMin) / 60) * HOUR_HEIGHT, 24);
                                        const doctorName = doctorMap[appt.doctor_id] || 'Doctor';
                                        const color = getDoctorColor(appt.doctor_id, doctorMap);
                                        return (
                                            <AppointmentCard
                                                key={appt.id}
                                                appt={appt}
                                                doctorName={doctorName}
                                                color={color}
                                                onClick={onAppointmentClick}
                                                style={{ position: 'absolute', top, height, left: 2, right: 2 }}
                                            />
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Month View ────────────────────────────────
const MonthView = ({ date, appointments, doctorMap, onAppointmentClick }) => {
    const monthDays = useMemo(() => getMonthDays(date), [date]);
    const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="cal-month-view">
            <div className="cal-month-header-row">
                {weekLabels.map(d => (
                    <div key={d} className="cal-month-header-cell">{d}</div>
                ))}
            </div>
            <div className="cal-month-grid">
                {monthDays.map(({ date: cellDate, isCurrentMonth }, idx) => {
                    const cellAppts = appointments.filter(a => {
                        const d = new Date(a.meeting_date + 'T00:00:00');
                        return isSameDay(d, cellDate);
                    });
                    const isToday = isSameDay(cellDate, new Date());
                    return (
                        <div key={idx} className={`cal-month-cell ${!isCurrentMonth ? 'cal-month-cell-dim' : ''}`}>
                            <div className={`cal-month-day-num ${isToday ? 'cal-today' : ''}`}>
                                {cellDate.getDate()}
                            </div>
                            <div className="cal-month-appts">
                                {cellAppts.slice(0, 3).map(appt => {
                                    const doctorName = doctorMap[appt.doctor_id] || 'Dr.';
                                    const color = getDoctorColor(appt.doctor_id, doctorMap);
                                    return (
                                        <div
                                            key={appt.id}
                                            className="cal-month-appt-pill"
                                            style={{ background: color + '18', color, borderLeft: `3px solid ${color}` }}
                                            onClick={(e) => { e.stopPropagation(); onAppointmentClick(appt); }}
                                            title={`${doctorName} • ${appt.patient_details?.name || 'Patient'}`}
                                        >
                                            <span className="cal-month-pill-text">
                                                {appt.from?.split(' ')[0]} {doctorName}
                                            </span>
                                        </div>
                                    );
                                })}
                                {cellAppts.length > 3 && (
                                    <div className="cal-month-more">+{cellAppts.length - 3} more</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Main CalendarGrid ─────────────────────────
const CalendarGrid = ({ appointments, doctorMap, onAppointmentClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('week');

    const navigate = (dir) => {
        const d = new Date(currentDate);
        if (view === 'day') d.setDate(d.getDate() + dir);
        else if (view === 'week') d.setDate(d.getDate() + dir * 7);
        else d.setMonth(d.getMonth() + dir);
        setCurrentDate(d);
    };

    const goToday = () => setCurrentDate(new Date());

    const getDateLabel = () => {
        if (view === 'day') return formatDateLabel(currentDate);
        if (view === 'week') {
            const days = getWeekDays(currentDate);
            const from = days[0];
            const to = days[6];
            if (from.getMonth() === to.getMonth()) {
                return `${from.toLocaleDateString('en-US', { month: 'long' })} ${from.getDate()}–${to.getDate()}, ${from.getFullYear()}`;
            }
            return `${from.toLocaleDateString('en-US', { month: 'short' })} ${from.getDate()} – ${to.toLocaleDateString('en-US', { month: 'short' })} ${to.getDate()}, ${to.getFullYear()}`;
        }
        return formatMonthYear(currentDate);
    };

    return (
        <div className="cal-grid-container">
            {/* Toolbar */}
            <div className="cal-toolbar">
                <div className="cal-toolbar-left">
                    <button className="cal-btn-today" onClick={goToday}>Today</button>
                    <div className="cal-nav-arrows">
                        <button onClick={() => navigate(-1)}><i className="fas fa-chevron-left" /></button>
                        <button onClick={() => navigate(1)}><i className="fas fa-chevron-right" /></button>
                    </div>
                    <span className="cal-date-label">{getDateLabel()}</span>
                </div>
                <div className="cal-view-toggle">
                    {['day', 'week', 'month'].map(v => (
                        <button
                            key={v}
                            className={`cal-view-btn ${view === v ? 'cal-view-btn-active' : ''}`}
                            onClick={() => setView(v)}
                        >
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* View */}
            <div className="cal-view-area">
                {view === 'day' && (
                    <DayView date={currentDate} appointments={appointments} doctorMap={doctorMap} onAppointmentClick={onAppointmentClick} />
                )}
                {view === 'week' && (
                    <WeekView date={currentDate} appointments={appointments} doctorMap={doctorMap} onAppointmentClick={onAppointmentClick} />
                )}
                {view === 'month' && (
                    <MonthView date={currentDate} appointments={appointments} doctorMap={doctorMap} onAppointmentClick={onAppointmentClick} />
                )}
            </div>
        </div>
    );
};

export default CalendarGrid;
