import { useState, useEffect, useCallback, createContext, useContext } from "react";
import "./NewApp.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Eye, EyeOff, Gamepad2, CreditCard, Users, BarChart3, Settings, LogOut, History, Shield, Wallet, Copy, Check, ChevronRight, Sparkles, Star, Download, ArrowDownToLine, ArrowUpFromLine, RefreshCw, DollarSign, Menu, X, Clock } from "lucide-react";
import MasterControlHub from "./components/MasterControlHub";
import MasterControl from "./components/MasterControl";
import LandingPage from "./LandingPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

axios.defaults.withCredentials = true;

// Auth Context
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`);
      setUser(data);
    } catch { setUser(false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    setUser(data);
    return data;
  };

  const register = async (email, password, name, ageVerified) => {
    const { data } = await axios.post(`${API}/auth/register`, { email, password, name, age_verified: ageVerified });
    setUser(data);
    return data;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`);
    setUser(false);
  };

  const refreshUser = async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`);
      setUser(data);
    } catch { setUser(false); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/welcome" />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" />;
  return children;
};

// Animated Background
const CandyBackground = () => (
  <div className="candy-bg">
    {[...Array(15)].map((_, i) => (
      <div key={i} className={`candy candy-${(i % 5) + 1}`} style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${15 + Math.random() * 10}s`
      }} />
    ))}
    {[...Array(20)].map((_, i) => (
      <div key={`sparkle-${i}`} className="sparkle" style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`
      }} />
    ))}
  </div>
);

const LoadingScreen = () => (
  <div className="loading-screen">
    <CandyBackground />
    <div className="loader-container">
      <div className="sugar-loader"><Sparkles className="loader-icon" /></div>
      <p className="loader-text">Loading...</p>
    </div>
  </div>
);

// Login Page
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="auth-page">
      <CandyBackground />
      <div className="auth-wrapper">
        <div className="auth-brand">
          <div className="brand-icon"><Sparkles size={48} /></div>
          <h1 className="brand-title">Sugar City</h1>
          <h2 className="brand-subtitle">SWEEPS</h2>
          <p className="brand-tagline">Play Online Sweeps & Fish Games</p>
        </div>
        
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Welcome Back!</h2>
            <p>Sign in to your account</p>
          </div>
          
          {error && <div className="error-alert">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email Address</label>
              <input data-testid="login-email" type="email" placeholder="player@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            
            <div className="input-group">
              <label>Password</label>
              <div className="password-input">
                <input data-testid="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button data-testid="login-submit" type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? <span className="btn-loader"></span> : "Sign In"}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>New player? <Link to="/register">Register Now</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Register Page
const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!ageVerified) {
      setError("You must be 21+ years old to register");
      return;
    }
    if (!termsAccepted) {
      setError("You must accept the Terms and Conditions");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await register(email, password, name, ageVerified);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="auth-page">
      <CandyBackground />
      <div className="auth-wrapper">
        <div className="auth-brand">
          <div className="brand-icon"><Sparkles size={48} /></div>
          <h1 className="brand-title">Sugar City</h1>
          <h2 className="brand-subtitle">SWEEPS</h2>
          <p className="brand-tagline">Register to Play Now!</p>
        </div>
        
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Create Account</h2>
            <p>Join the sweetest games</p>
          </div>
          
          {error && <div className="error-alert">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Display Name</label>
              <input data-testid="register-name" type="text" placeholder="Player123" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            
            <div className="input-group">
              <label>Email Address</label>
              <input data-testid="register-email" type="email" placeholder="player@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            
            <div className="input-group">
              <label>Password</label>
              <div className="password-input">
                <input data-testid="register-password" type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <input data-testid="register-confirm-password" type={showPassword ? "text" : "password"} placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input data-testid="register-terms" type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                <span className="checkbox-custom"></span>
                <span>I accept the <a href="#" onClick={(e) => e.preventDefault()}>Terms & Conditions</a></span>
              </label>
              
              <label className="checkbox-label">
                <input data-testid="register-age-verify" type="checkbox" checked={ageVerified} onChange={(e) => setAgeVerified(e.target.checked)} />
                <span className="checkbox-custom"></span>
                <span><Shield size={14} /> I am <strong>21+ years old</strong></span>
              </label>
            </div>
            
            <button data-testid="register-submit" type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? <span className="btn-loader"></span> : "Register Now"}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Sign In</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard with Tabs
const Dashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("games");
  const [games, setGames] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  // AMOE Daily Claim State
  const [amoeEligible, setAmoeEligible] = useState(false);
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [claimingAmoe, setClaimingAmoe] = useState(false);

  const fetchGames = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/games`);
      setGames(data);
    } catch { toast.error("Failed to load games"); }
  }, []);
  
  const checkAmoeStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/amoe/status`);
      setAmoeEligible(data.eligible);
      setHoursRemaining(data.hours_remaining || 0);
    } catch {
      // AMOE status check failed silently
    }
  }, []);

  useEffect(() => { fetchGames(); checkAmoeStatus(); }, [fetchGames, checkAmoeStatus]);
  
  const handleDailyClaim = async () => {
    if (!amoeEligible || claimingAmoe) return;
    
    setClaimingAmoe(true);
    try {
      const { data } = await axios.post(`${API}/amoe/claim-daily`);
      toast.success(data.message);
      await refreshUser(); // Update balance
      await checkAmoeStatus(); // Update claim status
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Claim failed');
    } finally {
      setClaimingAmoe(false);
    }
  };

  const tabs = [
    { id: "games", label: "Games", icon: <Gamepad2 size={20} /> },
    { id: "deposit", label: "Deposit", icon: <ArrowDownToLine size={20} /> },
    { id: "redeem", label: "Redeem", icon: <RefreshCw size={20} /> },
    { id: "withdraw", label: "Withdraw", icon: <ArrowUpFromLine size={20} /> },
    { id: "transactions", label: "History", icon: <History size={20} /> },
    { id: "settings", label: "Settings", icon: <Settings size={20} /> },
    { id: "support", label: "Support", icon: <Shield size={20} /> },
  ];

  return (
    <div className="dashboard">
      <CandyBackground />
      
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <Sparkles className="header-logo" />
          <div className="header-title">
            <h1>Sugar City Sweeps</h1>
            <span>Official Player Lobby</span>
          </div>
        </div>
        
        <div className="header-right">
          {/* Dual Currency Balance Display */}
          <div className="balance-card sugar-tokens">
            <span className="balance-icon">🍬</span>
            <span className="balance-amount">{user?.sugar_tokens?.toLocaleString() || "0"}</span>
            <span className="balance-label">Tokens</span>
          </div>
          
          <div className="balance-card game-credits">
            <span className="balance-icon">🎮</span>
            <span className="balance-amount">{user?.game_credits?.toLocaleString() || "0"}</span>
            <span className="balance-label">Credits</span>
          </div>
          
          <div className="user-menu">
            <span className="user-name">{user?.name}</span>
            {user?.role === "admin" && (
              <button className="btn-icon" onClick={() => navigate("/admin")} title="Admin">
                <Settings size={20} />
              </button>
            )}
            <button className="btn-icon btn-logout" onClick={logout} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
          
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className={`tab-nav ${mobileMenuOpen ? "open" : ""}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="dashboard-content">
        {activeTab === "games" && (
          <div>
            {/* AMOE Daily Claim Banner */}
            <div className="amoe-banner">
              <div className="amoe-info">
                <h3>🎁 Free Credits Daily (No Purchase Necessary)</h3>
                <p>Claim 100 free credits every 24 hours - It's the law!</p>
              </div>
              <button 
                onClick={handleDailyClaim}
                disabled={!amoeEligible || claimingAmoe}
                className={`amoe-claim-btn ${amoeEligible ? 'eligible' : 'cooldown'}`}
              >
                {claimingAmoe ? (
                  <>
                    <RefreshCw size={20} className="spinning" />
                    Claiming...
                  </>
                ) : amoeEligible ? (
                  <>
                    <Download size={20} />
                    Claim 100 Free Credits
                  </>
                ) : (
                  <>
                    <Clock size={20} />
                    Come Back in {hoursRemaining}h
                  </>
                )}
              </button>
            </div>
            <GamesTab games={games} />
          </div>
        )}
        {activeTab === "deposit" && <DepositTab games={games} onSuccess={refreshUser} />}
        {activeTab === "redeem" && <RedeemTab games={games} />}
        {activeTab === "withdraw" && <WithdrawTab games={games} user={user} onSuccess={refreshUser} />}
        {activeTab === "transactions" && <TransactionsTab />}
        {activeTab === "settings" && <SettingsTab user={user} onSuccess={refreshUser} />}
        {activeTab === "support" && <SupportTab user={user} />}
      </main>
      
      {/* Footer */}
      <footer className="dashboard-footer">
        <p>&copy; 2026 Sugar City Sweeps | Must be 18+ to play</p>
        <div className="footer-links">
          <a href="/api/legal/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          <span>•</span>
          <a href="/api/legal/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <span>•</span>
          <a href="/api/legal/responsible-gaming" target="_blank" rel="noopener noreferrer">Responsible Gaming</a>
        </div>
      </footer>
    </div>
  );
};

// Games Tab
const GamesTab = ({ games }) => {
  const { user } = useAuth();
  const [copiedField, setCopiedField] = useState("");

  const copyText = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
    toast.success("Copied!");
  };

  return (
    <div className="tab-content games-tab">
      {/* Player Credentials Banner */}
      {user?.game_username && (
        <div className="credentials-banner" data-testid="credentials-banner">
          <div className="cred-banner-title">
            <Shield size={18} />
            <span>Your Universal Game Login</span>
          </div>
          <p className="cred-banner-desc">Use these credentials to sign into ALL game platforms below</p>
          <div className="cred-banner-fields">
            <div className="cred-field" data-testid="cred-username">
              <label>Username</label>
              <div className="cred-value" onClick={() => copyText(user.game_username, "user")}>
                <span>{user.game_username}</span>
                {copiedField === "user" ? <Check size={14} /> : <Copy size={14} />}
              </div>
            </div>
            <div className="cred-field" data-testid="cred-password">
              <label>Password</label>
              <div className="cred-value" onClick={() => copyText(user.game_password, "pass")}>
                <span>{user.game_password}</span>
                {copiedField === "pass" ? <Check size={14} /> : <Copy size={14} />}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="section-header">
        <h2>Our Games</h2>
        <p>Download, sign in with your credentials above, and play</p>
      </div>
      <div className="games-grid">
        {games.map((game) => (
          <div key={game.id} className="game-card-simple" data-accent={game.accent_color} data-testid={`game-card-${game.id}`}>
            <div className="game-logo">
              <img 
                src={game.logo_url} 
                alt={game.name}
                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(game.name)}&background=1a1a2e&color=F59E0B&size=200&bold=true&font-size=0.35`; }}
              />
            </div>
            <h3>{game.name}</h3>
            <a href={game.game_url} target="_blank" rel="noopener noreferrer" className="download-btn" data-testid={`download-${game.id}`}>
              <Download size={16} />
              <span>Download & Play</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

// Deposit Tab
const DepositTab = ({ games, onSuccess }) => {
  const [selectedGame, setSelectedGame] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [cryptoInfo, setCryptoInfo] = useState(null);
  const [cardInfo, setCardInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLightning, setCopiedLightning] = useState(false);

  const suggestions = [10, 20, 50, 100, 200, 500];

  const fetchPaymentInfo = useCallback(async () => {
    try {
      const [crypto, card] = await Promise.all([
        axios.get(`${API}/payment/crypto-info`),
        axios.get(`${API}/payment/card-info`)
      ]);
      setCryptoInfo(crypto.data);
      setCardInfo(card.data);
    } catch {
      // Payment info fetch failed silently
    }
  }, []);

  useEffect(() => {
    fetchPaymentInfo();
    if (games.length > 0 && !selectedGame) setSelectedGame(games[0].id);
  }, [games, selectedGame, fetchPaymentInfo]);

  const handleStripePayment = async () => {
    if (!selectedGame) {
      toast.error("Please select a game");
      return;
    }
    if (!amount || parseFloat(amount) < 1) {
      toast.error("Minimum deposit is $1");
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await axios.post(`${API}/checkout/create`, {
        amount: parseFloat(amount),
        game_id: selectedGame,
        account_name: "deposit",
        origin_url: window.location.origin,
        payment_method: "stripe"
      });
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create checkout");
    } finally { setIsLoading(false); }
  };

  const copyToClipboard = (text, isLightning = false) => {
    navigator.clipboard.writeText(text);
    if (isLightning) {
      setCopiedLightning(true);
      setTimeout(() => setCopiedLightning(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    toast.success("Copied!");
  };

  return (
    <div className="tab-content deposit-tab">
      <div className="section-header">
        <h2>Deposit Funds</h2>
        <p className="sweeps-notice">
          🍬 Purchase <strong>Sugar Tokens</strong> + Get <strong>100% Bonus Game Credits</strong> free! • Example: $10 = 1,000 tokens + 1,000 bonus credits
        </p>
      </div>

      <div className="deposit-form">
        <div className="form-section">
          <label>Select Game</label>
          <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} className="game-select">
            {games.map((game) => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </select>
        </div>

        <div className="form-section">
          <label>Enter Amount</label>
          <div className="amount-input-box">
            <span className="currency">$</span>
            <input
              data-testid="deposit-amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <div className="quick-amounts">
            {suggestions.map((val) => (
              <button key={val} className={`quick-btn ${parseFloat(amount) === val ? "selected" : ""}`} onClick={() => setAmount(val.toString())}>
                ${val}
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label>Payment Method</label>
          <div className="payment-methods">
            {[
              { id: "stripe", label: "Card", icon: <CreditCard size={20} /> },
              { id: "crypto", label: "Crypto", icon: <span className="btc-icon">₿</span> },
              { id: "cards", label: "Cash Cards", icon: <DollarSign size={20} /> }
            ].map((method) => (
              <button
                key={method.id}
                data-testid={`method-${method.id}`}
                className={`method-btn ${paymentMethod === method.id ? "active" : ""}`}
                onClick={() => setPaymentMethod(method.id)}
              >
                {method.icon}
                <span>{method.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="payment-details">
          {paymentMethod === "stripe" && (
            <div className="payment-box">
              <p>Secure checkout powered by Stripe</p>
              <button className="btn-primary btn-pay" onClick={handleStripePayment} disabled={isLoading || !amount}>
                {isLoading ? <span className="btn-loader"></span> : `Pay $${amount || "0"}`}
              </button>
            </div>
          )}

          {paymentMethod === "crypto" && cryptoInfo && (
            <div className="payment-box crypto-box">
              <h3 style={{fontSize: '18px', marginBottom: '20px', color: 'var(--neon-cyan)'}}>Bitcoin (BTC)</h3>
              <div className="qr-code">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${cryptoInfo.btc_address}`} alt="BTC QR" />
              </div>
              <div className="wallet-address">
                <span style={{fontSize: '10px'}}>{cryptoInfo.btc_address}</span>
                <button className="copy-btn" onClick={() => copyToClipboard(cryptoInfo.btc_address, false)}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              
              <h3 style={{fontSize: '18px', margin: '30px 0 20px', color: 'var(--neon-gold)'}}>Lightning Network ⚡</h3>
              <div className="wallet-address">
                <span style={{fontSize: '9px', wordBreak: 'break-all'}}>{cryptoInfo.lightning_address}</span>
                <button className="copy-btn" onClick={() => copyToClipboard(cryptoInfo.lightning_address, true)}>
                  {copiedLightning ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              
              <p className="note" style={{marginTop: '25px'}}>Send ${amount || "0"} worth of BTC via either method</p>
              <p className="note">Contact support with TX ID after payment</p>
            </div>
          )}

          {paymentMethod === "cards" && cardInfo && (
            <div className="payment-box manual-box">
              <div className="pay-tag">{cardInfo.tag}</div>
              <button className="copy-btn-full" onClick={() => copyToClipboard(cardInfo.tag)}>
                <Copy size={16} /> Copy Tag
              </button>
              <p className="note">Send ${amount || "0"} via Cash App or Chime to the tag above</p>
              <p className="note">Include your email in the note/memo</p>
              <p className="note">Contact support after payment for credit activation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Redeem Tab - matches Withdraw layout
const RedeemTab = ({ games }) => {
  const { user, refreshUser } = useAuth();
  const [selectedGame, setSelectedGame] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (games.length > 0 && !selectedGame) setSelectedGame(games[0].id);
  }, [games, selectedGame]);

  const handleRedeem = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (parseFloat(amount) > (user?.game_credits || 0)) {
      toast.error("Insufficient game credits");
      return;
    }
    setIsLoading(true);
    try {
      toast.info("Redemption submitted! Your credits are being transferred to your selected game platform. Admin will process within 1-24 hours.");
      setAmount("");
      if (refreshUser) refreshUser();
    } catch (err) {
      toast.error("Redemption failed. Please contact support.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tab-content withdraw-tab" data-testid="redeem-tab">
      <div className="section-header">
        <h2>Redeem Credits</h2>
        <p>Transfer your Game Credits to a specific game platform</p>
      </div>

      <div className="withdraw-container">
        <div className="withdraw-form">
          <div className="form-section">
            <label>Select Game Platform</label>
            <select data-testid="redeem-game-select" value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)}>
              {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
            </select>
          </div>

          <div className="form-section">
            <label>Credits to Redeem</label>
            <div className="input-with-icon">
              <DollarSign size={20} />
              <input
                data-testid="redeem-amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter credit amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <small>Available Game Credits: {user?.game_credits?.toLocaleString() || "0"}</small>
          </div>

          <div className="withdraw-info">
            <p>How Redemption Works:</p>
            <ul>
              <li><span>Step 1:</span> <span>Select the game platform you want credits on</span></li>
              <li><span>Step 2:</span> <span>Enter how many credits to transfer</span></li>
              <li><span>Step 3:</span> <span style={{color: '#10B981'}}>Credits are loaded to your game account</span></li>
            </ul>
            <p style={{fontSize: '13px', marginTop: '15px', color: '#94A3B8'}}>
              Your universal game login will be used for the selected platform. Credits are typically loaded within minutes.
            </p>
          </div>

          <button data-testid="redeem-submit" className="btn-primary btn-withdraw" disabled={isLoading} onClick={handleRedeem}>
            {isLoading ? <span className="btn-loader"></span> : `Redeem ${amount || "0"} Credits`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Withdraw Tab - Bitcoin Withdrawal
const WithdrawTab = ({ games, user, onSuccess }) => {
  const [selectedGame, setSelectedGame] = useState("");
  const [amount, setAmount] = useState("");
  const [btcAddress, setBtcAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (games && games.length > 0 && !selectedGame) setSelectedGame(games[0].id);
  }, [games, selectedGame, setSelectedGame]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    if (!btcAddress || !amount || parseFloat(amount) <= 0) {
      toast.error("Please fill all fields with valid amounts");
      return;
    }

    if (parseFloat(amount) > (user?.credits || 0)) {
      toast.error("Insufficient credits");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API}/withdraw/request`, {
        game_id: selectedGame,
        amount_usd: parseFloat(amount),
        btc_address: btcAddress
      });
      
      toast.success(parseFloat(amount) >= 500 
        ? "Withdrawal submitted! Large amounts require admin approval (1-24 hrs)."
        : "Withdrawal processing! Bitcoin will be sent shortly."
      );
      
      setAmount("");
      setBtcAddress("");
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Withdrawal failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tab-content withdraw-tab">
      <div className="section-header">
        <h2>💰 Cash Out</h2>
        <p>Withdraw your winnings to Bitcoin</p>
      </div>

      <div className="withdraw-container">
        <form className="withdraw-form" onSubmit={handleWithdraw}>
          <div className="form-section">
            <label>Select Game</label>
            <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} required>
              {games && games.map((game) => (
                <option key={game.id} value={game.id}>{game.name}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label>Withdrawal Amount (USD)</label>
            <div className="input-with-icon">
              <DollarSign size={20} />
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <small>Available Credits: ${user?.credits?.toFixed(2) || "0.00"}</small>
          </div>

          <div className="form-section">
            <label>Bitcoin Address</label>
            <input
              type="text"
              placeholder="bc1q... or lnbc... (Lightning)"
              value={btcAddress}
              onChange={(e) => setBtcAddress(e.target.value)}
              required
            />
            <small>Enter your BTC or Lightning Network address</small>
          </div>

          <div className="withdraw-info">
            <p>Processing Times:</p>
            <ul>
              <li><span>Under $500:</span> <span style={{color: '#00ff00'}}>Instant ⚡</span></li>
              <li><span>$500 and above:</span> <span style={{color: '#ffd700'}}>1-24 hours ⏳</span></li>
            </ul>
            <p style={{fontSize: '13px', marginTop: '15px', color: '#aaa'}}>
              Large withdrawals require manual approval for security.
            </p>
          </div>

          <button type="submit" className="btn-primary btn-withdraw" disabled={isLoading}>
            {isLoading ? <span className="btn-loader"></span> : `Withdraw $${amount || "0"}`}
          </button>
        </form>
      </div>
    </div>
  );
};

// Transactions Tab
const TransactionsTab = () => {
  const [transactions, setTransactions] = useState([]);

  const fetchTransactions = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/user/transactions`);
      setTransactions(data);
    } catch { toast.error("Failed to load transactions"); }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  return (
    <div className="tab-content transactions-tab">
      <div className="section-header">
        <h2>Transaction History</h2>
        <p>View all your deposits and withdrawals</p>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <History size={48} />
          <p>No transactions yet</p>
        </div>
      ) : (
        <div className="transactions-list">
          {transactions.map((tx) => (
            <div key={tx.id} className={`transaction-row ${tx.status}`}>
              <div className="tx-icon">
                {tx.payment_method === "stripe" && <CreditCard size={20} />}
                {tx.payment_method === "crypto" && <span>₿</span>}
                {tx.payment_method === "cashapp" && <span>$</span>}
                {tx.payment_method === "chime" && <span>C</span>}
              </div>
              <div className="tx-details">
                <span className="tx-game">{tx.game_name}</span>
                <span className="tx-date">{new Date(tx.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Settings Tab
const SettingsTab = ({ user, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API}/user/password/change`, {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Password change failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      await axios.put(`${API}/user/profile`, { name });
      toast.success("Profile updated!");
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Profile update failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tab-content settings-tab">
      <div className="section-header">
        <h2>⚙️ Settings</h2>
        <p>Manage your account</p>
      </div>

      <div className="settings-container">
        {/* Profile Section */}
        <div className="settings-card">
          <h3>Profile Information</h3>
          <form onSubmit={handleProfileUpdate}>
            <div className="form-section">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-section">
              <label>Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                style={{opacity: 0.6}}
              />
              <small>Email cannot be changed</small>
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? <span className="btn-loader"></span> : "Update Profile"}
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="settings-card">
          <h3>Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-section">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-section">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="form-section">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? <span className="btn-loader"></span> : "Change Password"}
            </button>
          </form>
        </div>

        {/* Account Info */}
        <div className="settings-card">
          <h3>Account Information</h3>
          <div className="info-row">
            <span>Account Status:</span>
            <span className="status-badge active">Active</span>
          </div>
          <div className="info-row">
            <span>Member Since:</span>
            <span>{new Date(user?.created_at).toLocaleDateString()}</span>
          </div>
          <div className="info-row">
            <span>Current Credits:</span>
            <span className="credits-amount">${user?.credits?.toFixed(2) || "0.00"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Support Tab
const SupportTab = ({ user }) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/user/support/tickets`);
      setTickets(data);
    } catch {
      // Failed to load tickets silently
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      await axios.post(`${API}/user/support/ticket`, {
        subject,
        message,
        priority
      });
      
      toast.success("Support ticket created! We'll respond soon.");
      setSubject("");
      setMessage("");
      setPriority("normal");
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create ticket");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tab-content support-tab">
      <div className="section-header">
        <h2>🛡️ Support</h2>
        <p>We're here to help!</p>
      </div>

      <div className="support-container">
        {/* Create Ticket Form */}
        <div className="support-card">
          <h3>Create Support Ticket</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <label>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What do you need help with?"
                required
              />
            </div>

            <div className="form-section">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low - General Question</option>
                <option value="normal">Normal - Need Assistance</option>
                <option value="high">High - Urgent Issue</option>
              </select>
            </div>

            <div className="form-section">
              <label>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={5}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? <span className="btn-loader"></span> : "Submit Ticket"}
            </button>
          </form>
        </div>

        {/* My Tickets */}
        <div className="support-card">
          <h3>My Tickets</h3>
          {tickets.length === 0 ? (
            <p className="empty-state">No tickets yet. Create one above if you need help!</p>
          ) : (
            <div className="tickets-list">
              {tickets.map((ticket) => (
                <div key={ticket.ticket_id} className="ticket-item">
                  <div className="ticket-header">
                    <span className="ticket-subject">{ticket.subject}</span>
                    <span className={`ticket-status ${ticket.status}`}>{ticket.status}</span>
                  </div>
                  <div className="ticket-meta">
                    <span className={`ticket-priority priority-${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                    <span className="ticket-date">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="support-card contact-card">
          <h3>Other Ways to Reach Us</h3>
          <p><strong>Email:</strong> support@sugarcitysweeps.com</p>
          <p><strong>Hours:</strong> 24/7 Support</p>
          <p><strong>Response Time:</strong> Usually within 2-4 hours</p>
        </div>
      </div>
    </div>
  );
};

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("checking");
  const [paymentData, setPaymentData] = useState(null);
  const { refreshUser } = useAuth();
  const sessionId = searchParams.get("session_id");

  const pollStatus = useCallback(async (attempts) => {
    if (attempts >= 5) { setStatus("timeout"); return; }
    try {
      const { data } = await axios.get(`${API}/checkout/status/${sessionId}`);
      setPaymentData(data);
      if (data.payment_status === "paid") {
        setStatus("success");
        refreshUser();
      } else if (data.status === "expired") {
        setStatus("failed");
      } else {
        setTimeout(() => pollStatus(attempts + 1), 2000);
      }
    } catch { setStatus("error"); }
  }, [sessionId, refreshUser]);

  useEffect(() => {
    if (sessionId) pollStatus(0);
  }, [sessionId, pollStatus]);

  return (
    <div className="result-page">
      <CandyBackground />
      <div className="result-card">
        {status === "checking" && (
          <>
            <div className="result-loader"><Sparkles size={48} /></div>
            <h2>Processing Payment...</h2>
          </>
        )}
        {status === "success" && (
          <>
            <div className="result-icon success"><Check size={48} /></div>
            <h2>Payment Successful!</h2>
            <p>Credits have been added to your account</p>
            <Link to="/" className="btn-primary">Back to Dashboard</Link>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="result-icon error">✗</div>
            <h2>Payment Failed</h2>
            <Link to="/" className="btn-secondary">Try Again</Link>
          </>
        )}
      </div>
    </div>
  );
};

const PaymentCancel = () => (
  <div className="result-page">
    <CandyBackground />
    <div className="result-card">
      <div className="result-icon warning">!</div>
      <h2>Payment Cancelled</h2>
      <Link to="/" className="btn-secondary">Back to Dashboard</Link>
    </div>
  </div>
);

// Admin Panel (simplified - keeping existing logic)
const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showGameModal, setShowGameModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes, gamesRes, txRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/games/all`),
        axios.get(`${API}/admin/transactions`)
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setGames(gamesRes.data);
      setTransactions(txRes.data);
    } catch { toast.error("Failed to load data"); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveGame = async (gameData) => {
    try {
      if (editingGame) {
        await axios.put(`${API}/games/${editingGame.id}`, gameData);
      } else {
        await axios.post(`${API}/games`, gameData);
      }
      toast.success("Game saved");
      fetchData();
      setShowGameModal(false);
      setEditingGame(null);
    } catch { toast.error("Failed to save game"); }
  };

  const handleDeleteGame = async (gameId) => {
    if (window.confirm("Delete this game?")) {
      try {
        await axios.delete(`${API}/games/${gameId}`);
        toast.success("Game deleted");
        fetchData();
      } catch { toast.error("Failed to delete"); }
    }
  };

  const handleManualPayment = async (paymentData) => {
    try {
      await axios.post(`${API}/admin/payments/manual`, paymentData);
      toast.success("Credits added");
      fetchData();
      setShowPaymentModal(false);
      setSelectedUser(null);
    } catch { toast.error("Failed to add credits"); }
  };

  const handleUpdateUser = async (userData) => {
    try {
      await axios.put(`${API}/admin/users/${selectedUser.id}`, userData);
      toast.success("User updated");
      fetchData();
      setShowUserModal(false);
      setSelectedUser(null);
    } catch { toast.error("Failed to update user"); }
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 size={18} /> },
    { id: "games", label: "Games", icon: <Gamepad2 size={18} /> },
    { id: "users", label: "Users", icon: <Users size={18} /> },
    { id: "transactions", label: "Transactions", icon: <CreditCard size={18} /> }
  ];

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <Sparkles size={24} />
          <span>Admin</span>
        </div>
        <nav className="sidebar-nav">
          {tabs.map((tab) => (
            <button key={tab.id} data-testid={`admin-tab-${tab.id}`} className={`nav-item ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <button className="nav-item logout" onClick={() => navigate("/")}>
          <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /><span>Back</span>
        </button>
      </aside>

      <main className="admin-main">
        {activeTab === "dashboard" && (
          <div className="admin-dashboard">
            <h2>Dashboard</h2>
            <div className="stats-grid">
              <div className="stat-card"><Users size={32} /><div className="stat-value">{stats.total_users || 0}</div><div className="stat-label">Users</div></div>
              <div className="stat-card"><CreditCard size={32} /><div className="stat-value">{stats.completed_transactions || 0}</div><div className="stat-label">Payments</div></div>
              <div className="stat-card highlight"><Wallet size={32} /><div className="stat-value">${(stats.total_revenue || 0).toFixed(2)}</div><div className="stat-label">Revenue</div></div>
            </div>
          </div>
        )}

        {activeTab === "games" && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Games</h2>
              <button className="btn-primary" onClick={() => { setEditingGame(null); setShowGameModal(true); }}>+ Add Game</button>
            </div>
            <div className="data-table">
              <table>
                <thead><tr><th>Logo</th><th>Name</th><th>URL</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {games.map((game) => (
                    <tr key={game.id}>
                      <td><img src={game.logo_url} alt="" className="table-logo" onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(game.name)}&background=1a1a2e&color=F59E0B&size=40&bold=true`; }} /></td>
                      <td>{game.name}</td>
                      <td><a href={game.game_url} target="_blank" rel="noreferrer">{game.game_url}</a></td>
                      <td><span className={`badge ${game.is_active ? "active" : "inactive"}`}>{game.is_active ? "Active" : "Inactive"}</span></td>
                      <td>
                        <button className="btn-sm" onClick={() => { setEditingGame(game); setShowGameModal(true); }}>Edit</button>
                        <button className="btn-sm danger" onClick={() => handleDeleteGame(game.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="admin-section">
            <h2>Users</h2>
            <div className="data-table">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Credits</th><th>Age Verified</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>${(u.credits || 0).toFixed(2)}</td>
                      <td><span className={`badge ${u.age_verified ? "active" : "inactive"}`}>{u.age_verified ? "Yes" : "No"}</span></td>
                      <td>
                        <button className="btn-sm" onClick={() => { setSelectedUser(u); setShowUserModal(true); }}>Edit</button>
                        <button className="btn-sm primary" onClick={() => { setSelectedUser(u); setShowPaymentModal(true); }}>Add Credits</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="admin-section">
            <h2>Transactions</h2>
            <div className="data-table">
              <table>
                <thead><tr><th>Date</th><th>User</th><th>Game</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.created_at).toLocaleString()}</td>
                      <td>{tx.user_email}</td>
                      <td>{tx.game_name}</td>
                      <td>${tx.amount.toFixed(2)}</td>
                      <td>{tx.payment_method}</td>
                      <td><span className={`badge ${tx.status}`}>{tx.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showGameModal && <GameModal game={editingGame} onSave={handleSaveGame} onClose={() => { setShowGameModal(false); setEditingGame(null); }} />}
      {showPaymentModal && selectedUser && <ManualPaymentModal user={selectedUser} games={games} onSave={handleManualPayment} onClose={() => { setShowPaymentModal(false); setSelectedUser(null); }} />}
      {showUserModal && selectedUser && <UserEditModal user={selectedUser} games={games} onSave={handleUpdateUser} onClose={() => { setShowUserModal(false); setSelectedUser(null); }} />}
    </div>
  );
};

// Modals
const GameModal = ({ game, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: game?.name || "",
    logo_url: game?.logo_url || "",
    game_url: game?.game_url || "",
    description: game?.description || "",
    is_active: game?.is_active ?? true,
    accent_color: game?.accent_color || "#ff00ff"
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2>{game ? "Edit Game" : "Add Game"}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="form-group"><label>Name</label><input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
          <div className="form-group"><label>Logo URL</label><input value={formData.logo_url} onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} required /></div>
          <div className="form-group"><label>Download URL</label><input value={formData.game_url} onChange={(e) => setFormData({ ...formData, game_url: e.target.value })} required /></div>
          <div className="form-row">
            <label className="checkbox-label"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} /><span className="checkbox-custom"></span>Active</label>
          </div>
          <button type="submit" className="btn-primary">Save</button>
        </form>
      </div>
    </div>
  );
};

const UserEditModal = ({ user, games, onSave, onClose }) => {
  const [gameAccounts, setGameAccounts] = useState(user.game_accounts || {});
  const [gamePassword, setGamePassword] = useState(user.game_password || "");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2>Edit: {user.name}</h2>
        <p className="modal-subtitle">{user.email}</p>
        
        <div className="form-section">
          <label>Game Password (all games)</label>
          <input value={gamePassword} onChange={(e) => setGamePassword(e.target.value)} placeholder="Universal password" />
        </div>

        <div className="form-section">
          <label>Game Accounts</label>
          <div className="game-accounts-list">
            {games.map((game) => (
              <div key={game.id} className="game-account-row">
                <span>{game.name}</span>
                <input
                  placeholder="Account name"
                  value={gameAccounts[game.id]?.account_name || ""}
                  onChange={(e) => setGameAccounts({...gameAccounts, [game.id]: { game_name: game.name, account_name: e.target.value }})}
                />
              </div>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={() => onSave({ game_accounts: gameAccounts, game_password: gamePassword })}>Save</button>
      </div>
    </div>
  );
};

const ManualPaymentModal = ({ user, games, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    user_id: user.id,
    amount: 10,
    credits: 10,
    game_id: games[0]?.id || "",
    account_name: "manual",
    payment_method: "cashapp",
    notes: ""
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2>Add Credits: {user.name}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave({...formData, credits: formData.amount}); }}>
          <div className="quick-amounts">
            {[10, 20, 50, 100, 200].map((val) => (
              <button type="button" key={val} className={`quick-btn ${formData.amount === val ? "selected" : ""}`} onClick={() => setFormData({ ...formData, amount: val, credits: val })}>
                ${val}
              </button>
            ))}
          </div>
          <div className="form-group"><label>Amount</label><input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value), credits: parseFloat(e.target.value) })} /></div>
          <div className="form-group">
            <label>Game</label>
            <select value={formData.game_id} onChange={(e) => setFormData({ ...formData, game_id: e.target.value })}>
              {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Payment Method</label>
            <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
              <option value="cashapp">Cash App</option>
              <option value="chime">Chime</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Add Credits</button>
        </form>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
            <Route path="/payment/cancel" element={<ProtectedRoute><PaymentCancel /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
            <Route path="/master-control" element={<ProtectedRoute adminOnly><MasterControlHub /></ProtectedRoute>} />
            <Route path="/master-control/:platformId" element={<ProtectedRoute adminOnly><MasterControl /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </div>
    </AuthProvider>
  );
}

export default App;
