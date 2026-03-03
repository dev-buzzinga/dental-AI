import { supabase } from "../config/database.js";

export const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || "";
    
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authorization token missing",
            });
        }

        const token = authHeader.replace("Bearer ", "").trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authorization token missing",
            });
        }

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data?.user) {
            console.log("token error", error);
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
        }

        req.user = data.user;

        return next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal authentication error",
        });
    }
};

