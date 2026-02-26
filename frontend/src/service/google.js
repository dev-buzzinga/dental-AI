import axios from "../config/axiosConfig";

const connectGoogle = async (doctorId) => {
    return await axios.get("/google/connect", {
        params: { doctor_id: doctorId },
    });
};

export default {
    connectGoogle,
};
