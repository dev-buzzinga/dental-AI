export const incomingCall = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Incoming call successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to incoming call",
            error: error.message
        });
    }
};
