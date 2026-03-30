import * as schedulerService from "../services/scheduler.service.js";


export const getSchedulerConfig = async (req, res) => {
    try {
        return await schedulerService.getSchedulerConfig(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


export const saveSchedulerConfig = async (req, res) => {
    try {
        console.log("check req.body==>", req.user);
        return await schedulerService.saveSchedulerConfig(req, res);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};