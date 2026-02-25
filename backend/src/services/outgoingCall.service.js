export const outgoingCall = async (req, res) => {
    try {
        const { to } = req.body;
        return res.status(200).json({
            success: true,
            message: "Outgoing call successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to outgoing call",
            error: error.message
        });
    }
};
