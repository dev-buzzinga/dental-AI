// === CALL LOG ===
export const callLog = [
    { id: 1, name: "Isabella Davis", number: "(03) 9555 0199", duration: "11 min", initials: "ID" },
    { id: 2, name: "Emily Harris", number: "(08) 9444 0466", duration: "8 min", initials: "EH" },
    { id: 3, name: "John Anderson", number: "(07) 3222 0355", duration: "5 min", initials: "JA" },
    { id: 4, name: "Michael Thompson", number: "(02) 6211 2233", duration: "4 min", initials: "MT" },
    { id: 5, name: "Olivia Parker", number: "(02) 9123 4567", duration: "10 min", initials: "OP" },
    { id: 6, name: "Sophia Ramirez", number: "(07) 4777 8899", duration: "6 min", initials: "SR" },
];

// === SMS DATA ===
export const initialSmsData = [
    {
        id: "EH", name: "Emily Harris", number: "(08) 9444 0466",
        preview: "That works perfectly, thank you!", time: "2m ago",
        unread: 0, ai: false, initials: "EH",
        messages: [
            { type: "patient", text: "Hi, I need to book an appointment for a clean and a filling please", time: "Yesterday 10:02 AM" },
            { type: "ai", text: "Hi Emily! Thanks for reaching out to Smile Dental 😊 We'd love to help you book in. Are you flexible on the day, or do you have a preferred day of the week?", time: "Yesterday 10:02 AM" },
            { type: "patient", text: "Tuesday or Wednesday mornings work best for me", time: "Yesterday 10:05 AM" },
            { type: "ai", text: "Perfect! We have availability this Tuesday Feb 18 at 10:00 AM or Wednesday Feb 19 at 9:30 AM. Which would you prefer?", time: "Yesterday 10:05 AM" },
            { type: "patient", text: "Tuesday at 10am sounds great", time: "Yesterday 10:07 AM" },
            { type: "ai", text: "Wonderful! I've booked you in for Tuesday Feb 18 at 10:00 AM with Dr. Rama for a clean and filling consultation. Is there anything else I can help you with?", time: "Yesterday 10:08 AM" },
            { type: "patient", text: "Quick question — should I eat before the appointment?", time: "Today 9:44 AM" },
            { type: "staff", text: "Hi Emily! Yes you can eat normally before your appointment. Just avoid anything too sugary right before. See you Tuesday! 😊", time: "Today 9:46 AM" },
            { type: "patient", text: "That works perfectly, thank you!", time: "Today 9:48 AM" },
        ],
    },
    { id: "TJ", name: "Tim Johnson", number: "+61 421 671 766", preview: "AI: Your appointment is confirmed for Feb 24", time: "15m ago", unread: 2, ai: true, initials: "TJ", messages: [] },
    { id: "BC", name: "Ben Carter", number: "+61 398 765 432", preview: "Can I change my appointment to Thursday?", time: "42m ago", unread: 1, ai: false, initials: "BC", messages: [] },
    { id: "ML", name: "Mark Lee", number: "+61 412 345 678", preview: "AI: Your balance of $120 is due on Mar 1", time: "1h ago", unread: 0, ai: true, initials: "ML", messages: [] },
    { id: "OP", name: "Olivia Parker", number: "(02) 9123 4567", preview: "Do you have anything earlier next week?", time: "3h ago", unread: 1, ai: false, initials: "OP", messages: [] },
    { id: "LN", name: "Liam Nguyen", number: "(02) 5555 6666", preview: "Thanks for the reminder, see you then!", time: "Yesterday", unread: 0, ai: false, initials: "LN", messages: [] },
    { id: "SR", name: "Sophia Ramirez", number: "(07) 4777 8899", preview: "AI: We accept HCF, Medibank and NIB", time: "Yesterday", unread: 0, ai: true, initials: "SR", messages: [] },
    { id: "JA", name: "John Anderson", number: "(07) 3222 0355", preview: "What should I avoid eating after the filling?", time: "2 days ago", unread: 0, ai: false, initials: "JA", messages: [] },
];

// === PHONE NUMBERS ===
export const initialPhoneNumbers = [
    { id: 1, number: "+61 2 8000 1234", label: "Main Reception", doctor: "Dr. Rama", type: "Inbound / Outbound", status: "Active", added: "Jan 5, 2026", initials: "R", color: "#EDE9FE", textColor: "#7C3AED", isAI: false },
    { id: 2, number: "+61 3 9000 5678", label: "After Hours AI", doctor: "AI Agent", type: "Inbound / Outbound", status: "Active", added: "Jan 12, 2026", initials: "robot", color: "#EDE9FE", textColor: "#7C3AED", isAI: true },
    { id: 3, number: "+61 7 5500 9012", label: "After Hours", doctor: "Dr. Patel", type: "Inbound / Outbound", status: "Active", added: "Feb 1, 2026", initials: "P", color: "#D1FAE5", textColor: "#065F46", isAI: false },
    { id: 4, number: "+61 8 6100 3456", label: "Spare Line", doctor: "Unassigned", type: "Outbound Only", status: "Inactive", added: "Feb 10, 2026", initials: "—", color: "#F3F4F6", textColor: "#6B7280", isAI: false },
    { id: 5, number: "+61 2 9100 7890", label: "AI Overflow", doctor: "AI Agent", type: "Inbound Only", status: "Active", added: "Feb 19, 2026", initials: "robot", color: "#EDE9FE", textColor: "#7C3AED", isAI: true },
];

// === VOICES ===
export const voices = [
    { id: 1, name: "Roger - Laid-Back, Casual, Resonant", gender: "Male" },
    { id: 2, name: "Sarah - Mature, Reassuring, Confident", gender: "Female" },
    { id: 3, name: "Laura - Enthusiast, Quirky Attitude", gender: "Female" },
    { id: 4, name: "Charlie - Deep, Confident, Energetic", gender: "Male" },
    { id: 5, name: "Emma - Warm, Friendly, Professional", gender: "Female" },
    { id: 6, name: "James - Calm, Authoritative, Clear", gender: "Male" },
    { id: 7, name: "Mia - Bright, Cheerful, Approachable", gender: "Female" },
    { id: 8, name: "Daniel - Smooth, Reassuring, Steady", gender: "Male" },
];

// === DOCTORS ===
export const initialDoctors = [
    { id: 1, name: "Dr. Rama", specialty: "Oral Surgeon", type: "Full-Time", phone: "+1 221 122 2222 222", email: "rama@smiledental.com", initials: "R", color: "#7C3AED", about: "Dr. Rama is an Oral Surgeon with experience in bridges, crowns, fillings and root canals with over 10 years of practice." },
    { id: 2, name: "Dr. Smith", specialty: "General Dentist", type: "Full-Time", phone: "+1 331 442 5555 666", email: "smith@smiledental.com", initials: "S", color: "#065F46", about: "Dr. Smith specializes in preventative care and general dentistry, focusing on patient comfort and long-term oral health." },
    { id: 3, name: "Dr. Patel", specialty: "Orthodontist", type: "Part-Time", phone: "+1 441 552 6666 777", email: "patel@smiledental.com", initials: "P", color: "#92400E", about: "Dr. Patel is our lead Orthodontist, dedicated to creating beautiful smiles through modern alignment techniques." },
];

// === PATIENTS ===
export const initialPatients = [
    { id: 1, name: "Ben", phone: "+61421671766", email: "ben@gmail.com", dob: "1985-03-14", gender: "Male", insurance: "HCF Private Health", lastVisit: "Jan 10, 2026", nextAppt: "Feb 24, 2026", balance: "$120.00", memberId: "HCF-2891044", totalSms: 9, aiSms: 6, unreadSms: 0 },
    { id: 2, name: "Liam N", phone: "+61421671766", email: "liam@gmail.com", dob: "1990-05-20", gender: "Male", insurance: "Bupa", lastVisit: "Jan 15, 2026", nextAppt: "Mar 02, 2026", balance: "$0.00", memberId: "BUPA-123456", totalSms: 4, aiSms: 2, unreadSms: 0 },
    { id: 3, name: "Mark", phone: "+61421671766", email: "mark@gmail.com", dob: "1982-11-12", gender: "Male", insurance: "Medibank", lastVisit: "Feb 01, 2026", nextAppt: "Mar 15, 2026", balance: "$50.00", memberId: "MEDI-789012", totalSms: 2, aiSms: 1, unreadSms: 0 },
    { id: 4, name: "Sarah Wilson", phone: "+13232323232", email: "sarah@gmail.com", dob: "1975-01-01", gender: "Female", insurance: "None", lastVisit: "Dec 20, 2025", nextAppt: "None", balance: "$0.00", memberId: "N/A", totalSms: 0, aiSms: 0, unreadSms: 0 },
    { id: 5, name: "Amy Chen", phone: "+11222222222", email: "amy@gmail.com", dob: "1988-08-08", gender: "Female", insurance: "NIB", lastVisit: "Jan 05, 2026", nextAppt: "None", balance: "$200.00", memberId: "NIB-555666", totalSms: 1, aiSms: 0, unreadSms: 1 },
    { id: 6, name: "Roger Taylor", phone: "+14343434343", email: "roger@gmail.com", dob: "1995-12-25", gender: "Male", insurance: "HBF", lastVisit: "Feb 10, 2026", nextAppt: "Apr 01, 2026", balance: "$0.00", memberId: "HBF-999000", totalSms: 5, aiSms: 3, unreadSms: 0 },
    { id: 7, name: "Diana Ross", phone: "+12131122222", email: "diana@gmail.com", dob: "1980-04-15", gender: "Female", insurance: "None", lastVisit: "Nov 15, 2025", nextAppt: "None", balance: "$0.00", memberId: "N/A", totalSms: 0, aiSms: 0, unreadSms: 0 },
    { id: 8, name: "Emily Harris", phone: "+61894440466", email: "emily@gmail.com", dob: "1992-07-14", gender: "Female", insurance: "HCF", lastVisit: "Jan 20, 2026", nextAppt: "Feb 18, 2026", balance: "$0.00", memberId: "HCF-112233", totalSms: 12, aiSms: 8, unreadSms: 0 },
    { id: 9, name: "Tim Johnson", phone: "+61421671766", email: "tim@gmail.com", dob: "1987-09-30", gender: "Male", insurance: "Bupa", lastVisit: "Feb 05, 2026", nextAppt: "Feb 24, 2026", balance: "$0.00", memberId: "BUPA-445566", totalSms: 8, aiSms: 5, unreadSms: 2 },
    { id: 10, name: "Olivia Parker", phone: "+61291234567", email: "olivia@gmail.com", dob: "1994-02-14", gender: "Female", insurance: "Medibank", lastVisit: "Jan 25, 2026", nextAppt: "Mar 10, 2026", balance: "$0.00", memberId: "MEDI-998877", totalSms: 10, aiSms: 7, unreadSms: 1 },
];

// === APPOINTMENT HISTORY ===
export const appointmentHistory = [
    { date: "19", day: "Wed", month: "Feb", type: "General Checkup", doctor: "Dr. Rama", status: "Upcoming" },
    { date: "10", day: "Fri", month: "Jan", type: "Hygiene Clean", doctor: "Dr. Rama", status: "Completed" },
    { date: "12", day: "Thu", month: "Dec", type: "Filling", doctor: "Dr. Smith", status: "Completed" },
    { date: "05", day: "Tue", month: "Nov", type: "Crown Fitting", doctor: "Dr. Patel", status: "Completed" },
    { date: "08", day: "Wed", month: "Oct", type: "Root Canal", doctor: "Dr. Rama", status: "Completed" },
    { date: "03", day: "Tue", month: "Sep", type: "General Checkup", doctor: "Dr. Rama", status: "Completed" },
];

// === CALL HISTORY ===
export const callHistoryData = [
    { type: "Inbound", date: "Feb 19, 2026", duration: "8 min 24 sec", icon: "fa-phone", iconColor: "#10B981", bgColor: "#D1FAE5" },
    { type: "Outbound", date: "Feb 10, 2026", duration: "3 min 12 sec", icon: "fa-phone", iconColor: "#7C3AED", bgColor: "#EDE9FE" },
    { type: "Missed", date: "Jan 28, 2026", duration: "—", icon: "fa-phone", iconColor: "#EF4444", bgColor: "#FEE2E2" },
    { type: "Inbound", date: "Jan 10, 2026", duration: "5 min 44 sec", icon: "fa-phone", iconColor: "#10B981", bgColor: "#D1FAE5" },
];

// === DENTAL SERVICES ===
export const dentalServices = [
    "Fillings", "Crowns", "Bridges", "Root Canal", "Teeth Whitening",
    "Cleaning & Scaling", "Orthodontics", "Implants", "Wisdom Tooth Extraction",
    "Veneers", "Dentures", "Invisalign",
];

// === SPECIALTIES ===
export const specialties = ["Oral Surgeon", "General Dentist", "Orthodontist", "Periodontist"];

// === DIALPAD KEYS ===
export const dialpadKeys = [
    ["1", ""], ["2", "ABC"], ["3", "DEF"],
    ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
    ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
    ["*", ""], ["0", "+"], ["#", ""],
];
