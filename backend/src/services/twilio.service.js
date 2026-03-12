import { generateToken } from "../utils/generateToken.js";
export const generateTwilioToken = async (req, res, next) => {
    try {
        let { identity } = req.body;
        const token = await generateToken(identity);
        return res.status(200).json({
            success: true,
            message: "Token generated successfully",
            token
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to generate token",
            error: error.message
        });
    }
};
