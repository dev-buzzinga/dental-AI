import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import "../../styles/login.css";

const Signup = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const { signup } = useContext(AuthContext);
    const showToast = useToast();
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();

        if (!agreed) {
            showToast("Please agree to the Terms & Conditions", "error");
            return;
        }

        setLoading(true);
        try {
            await signup(email, password, name);
            showToast("Success! Check your email for confirmation.", "success");
            navigate("/login");
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
                    <h1>Sign up</h1>
                    <p>Let's get you all set up so you can access your personal account.</p>
                </div>
                <form className="login-form" onSubmit={handleSignup}>
                    <div className="form-group">
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            type="text"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="off"
                            required
                        />
                    </div>
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

                    <div className="checkbox-group">
                        <input
                            type="checkbox"
                            id="terms"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                        />
                        <label htmlFor="terms" className="checkbox-label">
                            I agree to all the <Link to="/terms">Terms & Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>
                        </label>
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
                    </button>
                </form>
                <div className="login-footer">
                    <span className="signup-text">
                        Already have an account? <Link to="/login">Login</Link>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Signup;
