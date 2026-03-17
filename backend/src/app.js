import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import routes from "./routes/index.js";
import createError from 'http-errors';
import logger from "morgan";
const app = express();

// Middlewares
app.use(cors());
app.use(logger("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
    useTempFiles: false, // Store in memory for direct buffer access
    parseNested: true,
    debug: false
}));

// Routes
app.use("/api", routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.json({
        success: false,
        data: "not page found",
        message: err.message,
    });
});

export default app;
