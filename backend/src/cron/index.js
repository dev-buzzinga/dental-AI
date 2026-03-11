import cron from "node-cron";
import * as gmailService from "../services/gmail.service.js";

/**
 * Starts all cron jobs when the server boots.
 * - Appointment emails: runs every 1 hour (processAppointmentEmailsCron)
 */
export const startCronJobs = () => {
    // Every 1 hour at minute 0 (e.g. 1:00, 2:00, 3:00)
    cron.schedule("0 * * * *", async () => {
        try {
            console.log("Cron job [appointment-emails] started");
            await gmailService.processAppointmentEmailsCron();
        } catch (error) {
            console.error("Cron job [appointment-emails] error:", error);
        }
    });
};
