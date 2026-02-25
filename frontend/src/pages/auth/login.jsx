import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";
import logo from "../../assets/images/logo.png";
import { Link } from "react-router-dom";
import "../../styles/login.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const showToast = useToast();

    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            showToast("Login successful!", "success");
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page login-container">
            <div className="login-logo">
                <div className="login-logo-icon"><img src={logo} alt="DentalAI" /></div>
            </div>
            <div className="login-card">
                <div className="login-header">
                    <h1>Login</h1>
                    <p>Welcome back! Please enter your credentials to continue.</p>
                </div>
                <form className="login-form" onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Enter Your Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="off"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter Your Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="off"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "LOGGING IN..." : "LOGIN"}
                    </button>
                </form>
                <div className="login-footer">
                    <Link to="/forgot-password" title="Forgot password?">Forgot password?</Link>
                    <span className="signup-text">
                        Don't have an account? <Link to="/signup">Sign Up</Link>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Login;
