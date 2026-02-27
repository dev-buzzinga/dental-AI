import axios from "../config/axiosConfig";

const connectGoogle = async (doctorId) => {
    return await axios.get("/appointment/google/connect", {
        params: { doctor_id: doctorId },
    });
};

const createAppointment = async (appointment) => {
    return await axios.post("/appointment/create-appointment", appointment);
};
export default {
    connectGoogle,
    createAppointment,
};
