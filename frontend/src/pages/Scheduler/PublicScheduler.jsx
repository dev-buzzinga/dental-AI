import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Button,
    Paper,
    Card,
    CardContent,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormLabel,
    Grid,
    Chip,
    CircularProgress,
    Snackbar,
    Alert,
    Divider,
    Avatar,
    Skeleton
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getPublicSchedulerConfig,
    getPublicAppointmentTypes,
    getAvailableTimeSlots,
    createPublicAppointment
} from '../../service/scheduler';
import Swal from 'sweetalert2';

const steps = [
    'Appointment Type',
    'Date & Time',
    'Patient Info',
    'Confirmation'
];

const PublicScheduler = ({ previewMode = false, config: previewConfig = null }) => {

    /*************  ✨ Windsurf Command ⭐  *************/

    // const { uniqueKey } = useParams();
    const navigate = useNavigate();

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(true);
    // const [config, setConfig] = useState(null);
    const [config, setConfig] = useState({
        title: 'Book Your Appointment',
        subtitle: 'Schedule your appointment with us',
        primary_color: '#1976d2',
        secondary_color: '#f5f5f5',
        font_family: 'Roboto, sans-serif',
        logo_url: '',
        welcome_message: 'Welcome! Please select your preferred appointment time.',
        appointment_types_enabled: true,
        problem_description_enabled: true,
        date_selection_enabled: true,
        time_slot_selection_enabled: true,
        patient_info_enabled: true,
        confirmation_enabled: true,
        character_limit: 200,
        problemPlaceholder: 'Describe your problem in detail',
        custom_fields: [],
        redirect_url: ''

    });

    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const [timeSlots, setTimeSlots] = useState(null);
    const [uniqueKey, setUniqueKey] = useState(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [countryCode, setCountryCode] = useState('+1');
    const [selectedCountry, setSelectedCountry] = useState('US');
    const [emptySlots, setEmptySlots] = useState(false);
    const [formData, setFormData] = useState({
        appointment_type_id: '',
        appointment_type: '',
        problem_description: '',
        appointment_date: '',
        slot_StartTime: '',
        end_time: '',
        patient_name: '',
        patient_email: '',
        patient_phone: ''
    });

    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    useEffect(() => {

        const searchParams = new URLSearchParams(window.location.search);
        const uniqueKeyFromUrl = searchParams.get('key');
        const isPreview = searchParams.get('preview') === 'true';

        setUniqueKey(uniqueKeyFromUrl)

        if (isPreview) {
            // Preview mode - get config from localStorage
            const previewConfig = localStorage.getItem('schedulerPreviewConfig');
            if (previewConfig) {
                try {
                    const parsedConfig = JSON.parse(previewConfig);
                    setConfig(parsedConfig);
                    fetchAppointmentTypes();
                    setLoading(false)

                    return;
                } catch (error) {
                    console.error('Error parsing preview config:', error);
                }
            }
        }

        fetchSchedulerConfig()



        // if (previewMode && previewConfig) {
        //   setConfig(previewConfig);
        //   setLoading(false);
        // } else if (uniqueKey) {
        //   fetchSchedulerConfig();
        // }
    }, [uniqueKey]);

    const fetchSchedulerConfig = async () => {
        try {
            if (!uniqueKey) return;

            setLoading(true);
            //  await fetchAppointmentTypes();

            const response = await getPublicSchedulerConfig(uniqueKey);
            if (response.success) {
                // console.log(">>>. Response ----", response);
                const newConfig = response.data.widget_props;
                setConfig(newConfig);
                await fetchAppointmentTypes();
            } else {
                setToast({
                    open: true,
                    message: 'Scheduler not found',
                    severity: 'error'
                });
            }
        } catch (error) {
            console.error('Error fetching scheduler config:', error);
            setToast({
                open: true,
                message: 'Failed to load scheduler',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchAppointmentTypes = async () => {
        try {
            if (!uniqueKey) return;
            const response = await getPublicAppointmentTypes(uniqueKey);
            if (response.success) {
                setAppointmentTypes(response.data);
            }
        } catch (error) {
            console.error('Error fetching appointment types:', error);
        }
    };

    const fetchTimeSlots = async (date) => {
        try {
            setLoadingSlots(true);
            setEmptySlots(false);

            const response = await getAvailableTimeSlots(uniqueKey, date);
            if (response.success) {
                const normalizedSlots = normalizeSlotsResponse(response.data);
                const numberofSlots = normalizedSlots.reduce((count, doctor) => {
                    return count + (doctor?.slots?.length || 0);
                }, 0);

                setEmptySlots(numberofSlots === 0);
                setTimeSlots(normalizedSlots);
            }
        } catch (error) {
            console.error('Error fetching time slots:', error);
            setTimeSlots(null);
        } finally {
            setLoadingSlots(false);
        }
    };

    const normalizeSlotsResponse = (apiData) => {
        // New BE format: [{ doctor_id, doctor_name, specialist, available_slots: [{start,end,label}] }]
        if (Array.isArray(apiData)) {
            return apiData.map((doctor) => ({
                doctor_id: doctor.doctor_id ?? doctor.id ?? null,
                name: doctor.doctor_name || doctor.name || '',
                specialist: doctor.specialist || doctor.specialty || '',
                profile_img: doctor.profile_img || null,
                slots: (doctor.available_slots || doctor.slots || []).map((slot) => {
                    const start = slot?.start || slot?.start_time || '';
                    const end = slot?.end || slot?.end_time || '';
                    return {
                        start_time: start,
                        end_time: end,
                        label: start
                    };
                })
            }));
        }
        return [];
    };

    const formatPhoneNumber = (value) => {
        // Remove all non-digits
        const phoneNumber = value.replace(/\D/g, '');

        // Format based on length
        if (phoneNumber.length <= 3) {
            return phoneNumber;
        } else if (phoneNumber.length <= 6) {
            return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
        } else {
            return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
        }
    };

    const handleFieldChange = (field, value) => {
        let formattedValue = value;

        // Format phone number as user types
        if (field === 'patient_phone') {
            formattedValue = formatPhoneNumber(value);
        }

        // Validate patient name - only allow letters and spaces
        if (field === 'patient_name') {
            // Remove any characters that are not letters or spaces
            formattedValue = value.replace(/[^a-zA-Z\s]/g, '');
        }

        // If date changed, fetch time slots
        if (field === 'appointment_date') {
            setFormData(prev => ({
                ...prev,
                [field]: formattedValue,
                slot_StartTime: '',
                end_time: '',
            }));
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));

            if (value) {
                fetchTimeSlots(value);
            } else {
                setTimeSlots(null);
                setLoadingSlots(false);
            }

            return;
        }

        setFormData(prev => ({
            ...prev,
            [field]: formattedValue
        }));
        setErrors(prev => ({
            ...prev,
            [field]: ''
        }));


    };

    const validateStep = (step) => {
        const newErrors = {};

        // console.log(">>>. Step ----", step);
        // console.log(">>>. Form Data ----", formData);

        switch (step) {
            case 0:
                if (!formData.appointment_type_id) {
                    newErrors.appointment_type_id = 'Please select an appointment type';
                }
                if (config?.problem_description_enabled && !formData.problem_description.trim()) {
                    newErrors.problem_description = 'Please describe your problem';
                }
                break;
            case 1:
                if (!formData.appointment_date) {
                    newErrors.appointment_date = 'Please select a date';
                }
                if (!formData.slot_StartTime) {
                    newErrors.slot_StartTime = 'Please select a time slot';
                }
                break;
            case 2:
                if (!formData.patient_name.trim()) {
                    newErrors.patient_name = 'Name is required';
                }
                if (!formData.patient_email.trim()) {
                    newErrors.patient_email = 'Email is required';
                } else if (!/\S+@\S+\.\S+/.test(formData.patient_email)) {
                    newErrors.patient_email = 'Please enter a valid email';
                }
                if (!formData.patient_phone.trim()) {
                    newErrors.patient_phone = 'Phone number is required';
                } else {
                    // Remove all non-digit characters for validation
                    const phoneDigits = formData.patient_phone.replace(/\D/g, '');
                    if (phoneDigits.length < 10) {
                        newErrors.patient_phone = 'Please enter a valid phone number (minimum 10 digits)';
                    }
                }
                break;
            default:
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(activeStep)) {
            setActiveStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        const searchParams = new URLSearchParams(window.location.search);
        const isPreview = searchParams.get('preview') === 'true';

        if (isPreview) {
            // Show SweetAlert2 with timer
            let timerInterval;
            Swal.fire({
                title: 'Appointment Confirmed!',
                html: `
            <div style="text-align: center;">
              <p>Your appointment has been successfully booked.</p>
              <p>You will be redirected in <b id="timer">20</b> seconds.</p>
            </div>
          `,
                icon: 'success',
                timer: 20000,
                timerProgressBar: true,
                showConfirmButton: false,
                didOpen: () => {
                    const timer = Swal.getPopup().querySelector('#timer');
                    timerInterval = setInterval(() => {
                        const timeLeft = Math.ceil(Swal.getTimerLeft() / 1000);
                        timer.textContent = timeLeft;
                    }, 1000);
                },
                willClose: () => {
                    clearInterval(timerInterval);
                }
            }).then(() => {

                // console.log(">>>. Config --At Redirect--", config);

                if (config.redirect_url) {
                    // window.href = config.redirect_url;
                    // redirect to the url
                    // console.log(">>>. Config --At Redirect--", config.redirect_url);
                    window.location.href = config.redirect_url;
                } else {
                    // console.log("No Redirect URL");

                    // Reset form and go to first step
                    setFormData({
                        appointment_type_id: '',
                        appointment_type: '',
                        problem_description: '',
                        appointment_date: '',
                        start_time: '',
                        end_time: '',
                        patient_name: '',
                        patient_email: '',
                        patient_phone: ''
                    });
                    setActiveStep(0);
                }
            });


            return;
        }

        try {
            setLoading(true);
            const payload = {
                startTime: formData.slot_StartTime,
                endTime: formData.slot_EndTime,
                appointmentDate: formData.appointment_date,
                appointmentTypeId: formData.appointment_type_id,
                selectedDoctor: formData.slot_avaialbleDoctors,
                patientDetails: {
                    name: formData.patient_name,
                    email: formData.patient_email,
                    phone: `${countryCode}${formData.patient_phone.replace(/\D/g, '')}`,
                    country: selectedCountry
                },
                notes: formData.problem_description,
            }
            const response = await createPublicAppointment(uniqueKey, payload);

            // console.log(">>>. Response from createPublicAppointment ----", response);

            if (response?.success || response?.id || response?.data?.id) {
                // Show SweetAlert2 with timer
                let timerInterval;
                Swal.fire({
                    title: 'Appointment Confirmed!',
                    html: `
            <div style="text-align: center;">
              <p>Your appointment has been successfully booked.</p>
              <p>You will be redirected in <b id="timer">20</b> seconds.</p>
            </div>
          `,
                    icon: 'success',
                    timer: 20000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    didOpen: () => {
                        const timer = Swal.getPopup().querySelector('#timer');
                        timerInterval = setInterval(() => {
                            const timeLeft = Math.ceil(Swal.getTimerLeft() / 1000);
                            timer.textContent = timeLeft;
                        }, 1000);
                    },
                    willClose: () => {
                        clearInterval(timerInterval);
                    }
                }).then(() => {

                    if (config.redirect_url) {
                        // window.href = config.redirect_url;
                        // redirect to the url
                        // console.log(">>>. Config --At Redirect--", config.redirect_url);
                        window.location.href = config.redirect_url;
                    } else {
                        // console.log("No Redirect URL");
                        // Reset form and go to first step
                        setFormData({
                            appointment_type_id: '',
                            appointment_type: '',
                            problem_description: '',
                            appointment_date: '',
                            start_time: '',
                            end_time: '',
                            patient_name: '',
                            patient_email: '',
                            patient_phone: ''
                        });

                        setActiveStep(0);
                    }


                    // setActiveStep(0);
                });
            }
        } catch (error) {
            console.error('Error creating appointment:', error);
            setToast({
                open: true,
                message: 'Failed to book appointment',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseToast = () => {
        setToast(prev => ({ ...prev, open: false }));
    };

    // Dynamic MUI theme based on config
    const theme = createTheme({
        palette: {
            primary: {
                main: config.primary_color || '#1976d2',
            },
        },
        typography: {
            fontFamily: config.font_family || 'Roboto, sans-serif',
        },
    });



    if (!config && !previewMode) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <Typography variant="h6" color="error">
                    Scheduler not found
                </Typography>
            </Box>
        );
    }

    // 1. Stepper custom styles
    const stepperSx = {
        '& .MuiStepIcon-root': {
            color: config.primary_color + '33', // faded for inactive
            fontFamily: config.font_family
        },
        '& .MuiStepIcon-root.Mui-active': {
            color: config.primary_color,
            fontFamily: config.font_family
        },
        '& .MuiStepIcon-root.Mui-completed': {
            color: config.primary_color,
            fontFamily: config.font_family
        },
        '& .MuiStepLabel-label': {
            fontFamily: config.font_family
        },
    };

    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Select Appointment Type
                        </Typography>

                        {config.appointment_types_enabled && (
                            <FormControl fullWidth error={!!errors.appointment_type_id} sx={{ mb: 3 }}>
                                <InputLabel>Appointment Type</InputLabel>
                                <Select
                                    value={formData.appointment_type_id}
                                    onChange={(e) => {
                                        const selectedType = appointmentTypes.find(type => type.id === e.target.value);
                                        handleFieldChange('appointment_type_id', e.target.value);
                                        handleFieldChange('appointment_type', selectedType?.name || '');
                                    }}
                                    label="Appointment Type"
                                >
                                    {appointmentTypes.map((type) => (
                                        <MenuItem key={type.id} value={type.id}>
                                            {/* {type.name} - ${type.price} */}
                                            {type.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.appointment_type_id && (
                                    <Typography variant="caption" color="error">
                                        {errors.appointment_type_id}
                                    </Typography>
                                )}
                            </FormControl>
                        )}

                        {config.problem_description_enabled && (
                            <TextField
                                fullWidth
                                label={config.problemPlaceholder || 'Problem Description'}
                                multiline
                                rows={4}
                                value={formData.problem_description}
                                onChange={(e) => {
                                    if (e.target.value.length <= (config.character_limit || 200)) {
                                        handleFieldChange('problem_description', e.target.value);
                                    }
                                }}
                                error={!!errors.problem_description}
                                helperText={
                                    (errors.problem_description ? errors.problem_description + ' ' : '') +
                                    `${formData.problem_description.length}/${config.character_limit || 200}`
                                }
                                placeholder={config.problemPlaceholder || 'Describe your symptoms or reason for visit...'}
                                inputProps={{
                                    maxLength: config.character_limit || 200,
                                    style: { fontFamily: config.font_family }
                                }}
                                sx={{ fontFamily: config.font_family }}
                            />
                        )}
                    </Box>
                );

            case 1:
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Choose Date & Time
                        </Typography>

                        {config.date_selection_enabled && (
                            <TextField
                                fullWidth
                                type="date"
                                label="Appointment Date"
                                value={formData.appointment_date}
                                onChange={(e) => handleFieldChange('appointment_date', e.target.value)}
                                error={!!errors.appointment_date}
                                helperText={errors.appointment_date}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: new Date().toISOString().split('T')[0] }}
                                sx={{ mb: 3 }}
                            />
                        )}

                        {config.time_slot_selection_enabled && formData.appointment_date && (
                            <Box>
                                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                    Available Time Slots
                                    {loadingSlots && (
                                        <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                                            (Loading...)
                                        </Typography>
                                    )}
                                </Typography>

                                {loadingSlots ? (
                                    <Grid container spacing={1}>
                                        {Array.from({ length: 8 }).map((_, index) => (
                                            <Grid item xs={6} sm={4} key={index}>
                                                <Skeleton
                                                    height={28}
                                                    width="100%"
                                                    borderRadius={16}
                                                    style={{
                                                        border: '1px solid #e0e0e0',
                                                        backgroundColor: '#f5f5f5',
                                                        minWidth: '80px'
                                                    }}
                                                    baseColor="#f0f0f0"
                                                    highlightColor="#e0e0e0"
                                                />
                                            </Grid>
                                        ))}
                                    </Grid>
                                ) : !emptySlots && Array.isArray(timeSlots) && timeSlots.length > 0 ? (
                                    timeSlots.map((value) => {
                                        if (!value || !value.slots || value.slots.length === 0) return null;
                                        return (
                                            <div key={`doctor-${value.doctor_id || value.name}`}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    {value.profile_img ? <Avatar src={value.profile_img} /> : <Avatar>{(value.name || 'D').charAt(0)}</Avatar>}
                                                    <Box sx={{ flexGrow: 1, ml: 2 }}>
                                                        <Typography variant="body2" sx={{
                                                            fontWeight: 500,
                                                            fontSize: '14px',
                                                            textTransform: 'capitalize',
                                                            pb: 0,
                                                            mb: 0,
                                                        }}>
                                                            {value.name}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                                            {(value.specialist || '').replaceAll("-", " ")}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Grid container spacing={1}>
                                                    {value.slots.map((slot, index) => (
                                                        <Grid item xs={6} sm={4} key={`${value.doctor_id || value.name}-${slot.start_time}-${index}`} sx={{ mb: 3 }}>
                                                            <Chip
                                                                label={slot.start_time}
                                                                onClick={() => {
                                                                    handleFieldChange('selectedSlotIndex', index);
                                                                    handleFieldChange('slot_StartTime', slot.start_time);
                                                                    handleFieldChange('slot_EndTime', slot.end_time);
                                                                    handleFieldChange('slot_avaialbleDoctors', value.doctor_id);
                                                                }}
                                                                color={formData.slot_StartTime === slot.start_time && formData.selectedSlotIndex === index && formData.slot_avaialbleDoctors === value.doctor_id ? 'primary' : 'default'}
                                                                variant={formData.slot_StartTime === slot.start_time && formData.selectedSlotIndex === index && formData.slot_avaialbleDoctors === value.doctor_id ? 'filled' : 'outlined'}
                                                                sx={{ width: '100%' }}
                                                            />
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 3 }}>
                                        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                                            No available slots for the selected date
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Please select a different date
                                        </Typography>
                                    </Box>
                                )}

                                {errors.slot_StartTime && (
                                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                                        {errors.slot_StartTime}
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                );

            case 2:
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Patient Information
                        </Typography>

                        {config.patient_info_enabled && (
                            <Grid container spacing={2}>
                                <Grid item xs={12} size={12}>
                                    <TextField
                                        fullWidth
                                        label="Full Name"
                                        value={formData.patient_name}
                                        onChange={(e) => handleFieldChange('patient_name', e.target.value)}
                                        error={!!errors.patient_name}
                                        helperText={errors.patient_name}
                                    />
                                </Grid>
                                <Grid item xs={12} size={12}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        type="email"
                                        value={formData.patient_email}
                                        onChange={(e) => handleFieldChange('patient_email', e.target.value)}
                                        error={!!errors.patient_email}
                                        helperText={errors.patient_email}
                                    />
                                </Grid>
                                <Grid item xs={12} size={12}>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <FormControl sx={{ minWidth: 120 }}>
                                            <InputLabel>Country</InputLabel>
                                            <Select
                                                value={selectedCountry}
                                                onChange={(e) => {
                                                    setSelectedCountry(e.target.value);
                                                    const countryCodeMap = {
                                                        'US': '+1',
                                                        'CA': '+1',
                                                        'GB': '+44',
                                                        'AU': '+61',
                                                        'NZ': '+64',
                                                        'IN': '+91'
                                                    };
                                                    setCountryCode(countryCodeMap[e.target.value]);
                                                }}
                                                label="Country"
                                            >
                                                <MenuItem value="US">🇺🇸 +1 (US)</MenuItem>
                                                <MenuItem value="CA">🇨🇦 +1 (CA)</MenuItem>
                                                <MenuItem value="GB">🇬🇧 +44 (GB)</MenuItem>
                                                <MenuItem value="AU">🇦🇺 +61 (AU)</MenuItem>
                                                <MenuItem value="NZ">🇳🇿 +64 (NZ)</MenuItem>
                                                <MenuItem value="IN">🇮🇳 +91 (IN)</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            fullWidth
                                            label="Phone Number"
                                            value={formData.patient_phone}
                                            onChange={(e) => handleFieldChange('patient_phone', e.target.value)}
                                            error={!!errors.patient_phone}
                                            helperText={errors.patient_phone || "Enter phone number without country code"}
                                            placeholder="e.g., 555-123-4567"
                                        />
                                    </Box>
                                </Grid>
                            </Grid>
                        )}
                    </Box>
                );

            case 3:
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Confirm Appointment
                        </Typography>

                        <Card variant="outlined" sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                                    Appointment Details
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid item size={6}>
                                        <Typography variant="body2" color="textSecondary">
                                            Type
                                        </Typography>
                                        <Typography variant="body1">
                                            {formData.appointment_type}
                                        </Typography>
                                    </Grid>
                                    <Grid item size={6}>
                                        <Typography variant="body2" color="textSecondary">
                                            Date & Time
                                        </Typography>
                                        <Typography variant="body1">
                                            {new Date(formData.appointment_date).toLocaleDateString()}  {" "} {formData.slot_StartTime}

                                        </Typography>
                                    </Grid>
                                    {/* <Grid item size={6}>
                    <Typography variant="body2" color="textSecondary">
                      Time
                    </Typography>
                    <Typography variant="body1">
                    </Typography>
                  </Grid> */}
                                    <Grid item size={6}>
                                        <Typography variant="body2" color="textSecondary">
                                            Patient
                                        </Typography>
                                        <Typography variant="body1">
                                            {formData.patient_name}
                                        </Typography>
                                    </Grid>
                                    <Grid item size={6}>
                                        <Typography variant="body2" color="textSecondary">
                                            Phone
                                        </Typography>
                                        <Typography variant="body1">
                                            {countryCode}-{formData.patient_phone}
                                        </Typography>
                                    </Grid>
                                    {formData.problem_description && (
                                        <Grid item size={12}>
                                            <Typography variant="body2" color="textSecondary">
                                                Problem Description
                                            </Typography>
                                            <Typography variant="body1">
                                                {formData.problem_description}
                                            </Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Box>
                );

            default:
                return 'Unknown step';
        }
    };


    // if (loading) {
    //   return (
    //     <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    //       <CircularProgress />
    //     </Box>
    //   );
    // }

    // if (!loading) {

    // }

    return (
        <ThemeProvider theme={theme}>
            {loading ? (
                <Box sx={{ minHeight: '100vh', backgroundColor: config.secondary_color, fontFamily: config.font_family }}>
                    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3, fontFamily: config.font_family }}>
                        {/* Header Skeleton */}
                        <Box textAlign="center" sx={{ mb: 4, fontFamily: config.font_family }}>
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                                <Skeleton height={60} width={180} style={{ borderRadius: 8 }} />
                            </Box>
                            <Skeleton height={40} width={320} style={{ margin: '0 auto 12px auto', borderRadius: 8 }} />
                            <Skeleton height={28} width={220} style={{ margin: '0 auto 12px auto', borderRadius: 8 }} />
                            <Skeleton height={20} width={380} style={{ margin: '0 auto', borderRadius: 8 }} />
                        </Box>
                        {/* Stepper Skeleton */}
                        <Paper elevation={2} sx={{ p: 3, mb: 3, fontFamily: config.font_family }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {steps.map((_, idx) => (
                                    <Skeleton key={idx} height={32} width={90} style={{ borderRadius: 16 }} />
                                ))}
                            </Box>
                        </Paper>
                        {/* Content Skeleton */}
                        <Paper elevation={2} sx={{ p: 4, mb: 3, fontFamily: config.font_family }}>
                            <Skeleton height={32} width={260} style={{ marginBottom: 24, borderRadius: 8 }} />
                            <Skeleton height={48} width="100%" style={{ marginBottom: 16, borderRadius: 8 }} />
                            <Skeleton height={48} width="100%" style={{ marginBottom: 16, borderRadius: 8 }} />
                            <Skeleton height={48} width="100%" style={{ marginBottom: 16, borderRadius: 8 }} />
                            <Skeleton height={48} width="100%" style={{ marginBottom: 16, borderRadius: 8 }} />
                            <Skeleton height={32} width={180} style={{ marginBottom: 16, borderRadius: 8 }} />
                        </Paper>
                        {/* Navigation Skeleton */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Skeleton height={40} width={120} style={{ borderRadius: 8 }} />
                            <Skeleton height={40} width={180} style={{ borderRadius: 8 }} />
                        </Box>
                    </Box>
                </Box>
            ) : (
                <div className='custom-scroll' style={{
                    height: "100vh",
                    overflowY: "auto"
                }}>
                    <Box
                        sx={{
                            minHeight: '100vh',
                            backgroundColor: config.secondary_color,
                            fontFamily: config.font_family,
                            // overflowY: "auto"
                        }}
                    >
                        <Snackbar
                            open={toast.open}
                            autoHideDuration={6000}
                            onClose={handleCloseToast}
                            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                        >
                            <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%' }}>
                                {toast.message}
                            </Alert>
                        </Snackbar>

                        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3, fontFamily: config.font_family }}>
                            {/* Header */}
                            <Box textAlign="center" sx={{ mb: 4, fontFamily: config.font_family }}>
                                {config.logo_url && (
                                    <Box sx={{ mb: 2 }}>
                                        <img
                                            src={config.logo_url}
                                            alt="Logo"
                                            style={{
                                                maxHeight: 80,
                                                maxWidth: 300,
                                                objectFit: 'contain'
                                            }}
                                        />
                                    </Box>
                                )}

                                <Typography
                                    variant="h3"
                                    sx={{
                                        color: config.primary_color,
                                        mb: 1,
                                        fontWeight: 600,
                                        fontFamily: config.font_family
                                    }}
                                >
                                    {config.title}
                                </Typography>

                                {config.subtitle && (
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            color: '#666',
                                            mb: 2,
                                            fontFamily: config.font_family
                                        }}
                                    >
                                        {config.subtitle}
                                    </Typography>
                                )}

                                <Typography
                                    variant="body1"
                                    sx={{
                                        color: '#555',
                                        fontFamily: config.font_family
                                    }}
                                >
                                    {config.welcome_message}
                                </Typography>
                            </Box>

                            {/* Stepper */}
                            <Paper elevation={2} sx={{ p: 3, mb: 3, fontFamily: config.font_family }}>
                                <Stepper activeStep={activeStep} alternativeLabel sx={stepperSx}>
                                    {steps.map((label, index) => (
                                        <Step key={label}>
                                            <StepLabel sx={{ fontFamily: config.font_family }}>{label}</StepLabel>
                                        </Step>
                                    ))}
                                </Stepper>
                            </Paper>

                            {/* Content */}
                            <Paper elevation={2} sx={{ p: 4, mb: 3, fontFamily: config.font_family }}>
                                {getStepContent(activeStep)}
                            </Paper>

                            {/* Navigation */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Button
                                    disabled={activeStep === 0}
                                    onClick={handleBack}
                                >
                                    Back
                                </Button>

                                <Box>
                                    {activeStep === steps.length - 1 ? (
                                        <Button
                                            variant="contained"
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            startIcon={loading ? <CircularProgress size={20} /> : null}
                                            sx={{
                                                backgroundColor: config.primary_color,
                                                mb: 2,
                                                '&:hover': {
                                                    backgroundColor: config.primary_color,
                                                    opacity: 0.8
                                                }
                                            }}
                                        >
                                            {loading ? 'Booking...' : 'Confirm Appointment'}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="contained"
                                            onClick={handleNext}
                                            sx={{
                                                backgroundColor: config.primary_color,
                                                mb: 2,
                                                '&:hover': {
                                                    backgroundColor: config.primary_color,
                                                    opacity: 0.8
                                                }
                                            }}
                                        >
                                            Next
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </div>
            )}
        </ThemeProvider>
    );
};

export default PublicScheduler; 