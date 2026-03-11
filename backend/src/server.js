import app from "./app.js";
import { config } from "./config/env.js";
import { startCronJobs } from "./cron/index.js";

app.listen(config.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${config.PORT}`);
    startCronJobs();
});
