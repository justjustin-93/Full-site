import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, DollarSign, Gift, Star, Gamepad2, CreditCard, Bitcoin, Clock, ChevronDown, Sparkles, Users, Award, Lock } from 'lucide-react';
import './LandingPage.css';

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/277850fc-bc6e-455b-9c5c-b658f6c65a73/images/a30c0d70040e1a99de5614df607c7ce231abf1df282ad4f76bf209d7f6a36efc.png";
const MASCOT_BTC = "https://static.prod-images.emergentagent.com/jobs/277850fc-bc6e-455b-9c5c-b658f6c65a73/images/7dbdd8161505460ef26d829a8986a51218e82196de098bc35962f0db3ddfcc81.png";
const MASCOT_CARD = "https://static.prod-images.emergentagent.com/jobs/277850fc-bc6e-455b-9c5c-b658f6c65a73/images/573d43a3aa3e00d0d561ba039b5e05f84d1b59136a2a5d17b16a56b2ea931a0d.png";
const FLOATING_TOKENS = "https://static.prod-images.emergentagent.com/jobs/277850fc-bc6e-455b-9c5c-b658f6c65a73/images/334ade12d4c02b6690501366e3f0b2f52aa9b060c1b79d5cc50dd6f9f5eb289c.png";

const GAME_PLATFORMS = [
  { id: 1, name: 'Fire Kirin', desc: 'Classic fish shooting action', gradient: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)', icon: Gamepad2 },
  { id: 2, name: 'Juwa', desc: 'Premium slot collection', gradient: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)', icon: Star },
  { id: 3, name: 'Orion Stars', desc: 'Galaxy-themed adventures', gradient: 'linear-gradient(135deg, #9D50BB 0%, #6E48AA 100%)', icon: Sparkles },
  { id: 4, name: 'Ultra Panda', desc: 'Action-packed arcade games', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', icon: Zap },
  { id: 5, name: 'Panda Master', desc: 'Skill-based gaming', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', icon: Award },
  { id: 6, name: 'Game Vault', desc: 'Trophy collection classics', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', icon: Lock },
  { id: 7, name: 'vBlink', desc: 'Gem matching mania', gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)', icon: DollarSign },
];

const StatCounter = ({ end, label, prefix = "" }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return (
    <div className="lp-stat" data-testid="stat-counter">
      <span className="lp-stat-num">{prefix}{count.toLocaleString()}</span>
      <span className="lp-stat-label">{label}</span>
    </div>
  );
};

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="lp" data-testid="landing-page">
      {/* Navbar */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`} data-testid="landing-nav">
        <div className="lp-nav-inner">
          <Link to="/" className="lp-logo" data-testid="landing-logo">
            <Sparkles className="lp-logo-icon" />
            <div>
              <span className="lp-logo-text">Sugar City</span>
              <span className="lp-logo-sub">SWEEPS</span>
            </div>
          </Link>
          <div className="lp-nav-links">
            <a href="#games" className="lp-nav-link" data-testid="nav-games">Games</a>
            <a href="#how" className="lp-nav-link" data-testid="nav-how">How It Works</a>
            <a href="#payments" className="lp-nav-link" data-testid="nav-payments">Payments</a>
            <Link to="/login" className="lp-nav-signin" data-testid="nav-signin">Sign In</Link>
            <Link to="/register" className="lp-nav-cta" data-testid="nav-register">Play Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero" data-testid="hero-section">
        <div className="lp-hero-bg" style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="lp-hero-overlay" />
        <div className="lp-hero-content">
          <div className="lp-hero-left">
            <div className="lp-hero-badge" data-testid="hero-badge">
              <Gift size={16} />
              <span>100 FREE Credits Daily — No Purchase Required</span>
            </div>
            <h1 className="lp-hero-title">
              Win Real<br />
              <span className="lp-hero-gold">Bitcoin</span> Playing<br />
              Your Favorite Games
            </h1>
            <p className="lp-hero-desc">
              Premium sweepstakes platform with 7+ game platforms. Deposit with card, crypto, or Cash App. Redeem winnings as Bitcoin.
            </p>
            <div className="lp-hero-btns">
              <Link to="/register" className="lp-btn-primary" data-testid="hero-register-btn">
                Start Playing Free
                <ArrowRight size={20} />
              </Link>
              <Link to="/login" className="lp-btn-ghost" data-testid="hero-login-btn">
                Sign In
              </Link>
            </div>
            <div className="lp-hero-pills">
              <div className="lp-pill"><Zap size={14} /> Instant Deposits</div>
              <div className="lp-pill"><Shield size={14} /> Legal & Compliant</div>
              <div className="lp-pill"><Bitcoin size={14} /> BTC Payouts</div>
            </div>
          </div>
          <div className="lp-hero-right">
            <img src={MASCOT_BTC} alt="Sugar City Mascot" className="lp-hero-mascot" data-testid="hero-mascot" />
            <img src={FLOATING_TOKENS} alt="Tokens" className="lp-hero-tokens" />
          </div>
        </div>
        <div className="lp-hero-scroll">
          <ChevronDown size={24} className="lp-bounce" />
        </div>
      </section>

      {/* Stats Bar */}
      <section className="lp-stats" data-testid="stats-section">
        <StatCounter end={2500} label="Active Players" prefix="" />
        <StatCounter end={7} label="Game Platforms" />
        <StatCounter end={100} label="Free Daily Credits" />
        <StatCounter end={50000} label="Credits Awarded" prefix="" />
      </section>

      {/* Games Section */}
      <section className="lp-games" id="games" data-testid="games-section">
        <div className="lp-section-head">
          <span className="lp-section-tag">Game Library</span>
          <h2 className="lp-section-title">7 Premium Platforms</h2>
          <p className="lp-section-desc">Choose from the best sweepstakes games in the industry</p>
        </div>
        <div className="lp-games-grid">
          {GAME_PLATFORMS.map((game, idx) => {
            const Icon = game.icon;
            return (
              <div key={game.id} className="lp-game-card" style={{ animationDelay: `${idx * 0.1}s` }} data-testid={`game-card-${game.id}`}>
                <div className="lp-game-icon-wrap" style={{ background: game.gradient }}>
                  <Icon size={32} />
                </div>
                <h3 className="lp-game-name">{game.name}</h3>
                <p className="lp-game-desc">{game.desc}</p>
                <div className="lp-game-status">
                  <span className="lp-game-dot" />
                  Available Now
                </div>
              </div>
            );
          })}
        </div>
        <div className="lp-games-cta">
          <Link to="/register" className="lp-btn-primary" data-testid="games-register-btn">
            Create Account & Play
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="lp-how" id="how" data-testid="how-section">
        <div className="lp-section-head">
          <span className="lp-section-tag">Getting Started</span>
          <h2 className="lp-section-title">How Sugar City Works</h2>
          <p className="lp-section-desc">Four simple steps to start winning</p>
        </div>
        <div className="lp-steps">
          {[
            { num: '01', title: 'Claim Free Credits', desc: 'Get 100 free credits every 24 hours. It\'s the law — no purchase required!', icon: Gift, color: '#10B981' },
            { num: '02', title: 'Purchase Sugar Tokens', desc: 'Buy tokens with card, crypto, or Cash App. Get 100% bonus game credits instantly.', icon: CreditCard, color: '#F59E0B' },
            { num: '03', title: 'Play Your Favorites', desc: 'Choose from 7 premium platforms like Fire Kirin, Juwa, Orion Stars, and more.', icon: Gamepad2, color: '#06B6D4' },
            { num: '04', title: 'Cash Out in Bitcoin', desc: 'Redeem your winnings directly to your Bitcoin or Lightning wallet. Fast payouts.', icon: Bitcoin, color: '#F59E0B' },
          ].map((step, idx) => (
            <div key={idx} className="lp-step" style={{ animationDelay: `${idx * 0.15}s` }} data-testid={`step-${idx + 1}`}>
              <div className="lp-step-num" style={{ color: step.color }}>{step.num}</div>
              <div className="lp-step-icon" style={{ background: `${step.color}20`, color: step.color }}>
                <step.icon size={28} />
              </div>
              <h3 className="lp-step-title">{step.title}</h3>
              <p className="lp-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Payment Methods */}
      <section className="lp-payments" id="payments" data-testid="payments-section">
        <div className="lp-payments-inner">
          <div className="lp-payments-text">
            <span className="lp-section-tag">Flexible Payments</span>
            <h2 className="lp-section-title">Deposit Your Way</h2>
            <p className="lp-section-desc">Multiple payment methods for your convenience. Instant credit allocation on all deposits.</p>
            <div className="lp-payment-methods">
              <div className="lp-payment-card" data-testid="payment-stripe">
                <CreditCard size={24} className="lp-payment-icon" />
                <div>
                  <h4>Card Payment</h4>
                  <p>Visa, Mastercard via Stripe</p>
                </div>
              </div>
              <div className="lp-payment-card" data-testid="payment-crypto">
                <Bitcoin size={24} className="lp-payment-icon" style={{ color: '#F59E0B' }} />
                <div>
                  <h4>Bitcoin & Lightning</h4>
                  <p>BTC + Lightning Network</p>
                </div>
              </div>
              <div className="lp-payment-card" data-testid="payment-cashapp">
                <DollarSign size={24} className="lp-payment-icon" style={{ color: '#10B981' }} />
                <div>
                  <h4>Cash App & Chime</h4>
                  <p>Instant transfers</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lp-payments-img">
            <img src={MASCOT_CARD} alt="Payment Methods" className="lp-payments-mascot" data-testid="payments-mascot" />
          </div>
        </div>
      </section>

      {/* Trust / Features */}
      <section className="lp-trust" data-testid="trust-section">
        <div className="lp-section-head">
          <span className="lp-section-tag">Why Sugar City?</span>
          <h2 className="lp-section-title">Built for Players</h2>
        </div>
        <div className="lp-trust-grid">
          {[
            { icon: Shield, title: 'Legal & Compliant', desc: 'AMOE (Alternate Method of Entry) ensures legal sweepstakes operation in all supported states.', color: '#10B981' },
            { icon: Zap, title: 'Instant Credits', desc: 'Credits allocated immediately after payment. No waiting, no delays.', color: '#F59E0B' },
            { icon: Bitcoin, title: 'Bitcoin Payouts', desc: 'Redeem your winnings as Bitcoin. Sent directly to your wallet.', color: '#06B6D4' },
            { icon: Lock, title: 'Secure Platform', desc: 'Encrypted data, JWT auth, brute force protection. Your account is safe.', color: '#EF4444' },
            { icon: Users, title: 'Growing Community', desc: 'Join thousands of players across 7 premium game platforms.', color: '#8B5CF6' },
            { icon: Clock, title: '24/7 Availability', desc: 'Play anytime. Claim free credits every 24 hours. Support always available.', color: '#F59E0B' },
          ].map((item, idx) => (
            <div key={idx} className="lp-trust-card" style={{ animationDelay: `${idx * 0.1}s` }} data-testid={`trust-card-${idx}`}>
              <div className="lp-trust-icon" style={{ background: `${item.color}15`, color: item.color }}>
                <item.icon size={24} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta" data-testid="cta-section">
        <div className="lp-cta-inner">
          <img src={FLOATING_TOKENS} alt="Tokens" className="lp-cta-tokens" />
          <h2>Ready to Start Winning?</h2>
          <p>Create your free account and claim 100 credits instantly. No deposit required.</p>
          <Link to="/register" className="lp-btn-primary lp-btn-lg" data-testid="cta-register-btn">
            Get Started Free
            <ArrowRight size={22} />
          </Link>
          <span className="lp-cta-note">Must be 21+ to play. Terms apply.</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer" data-testid="landing-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <Sparkles size={28} className="lp-footer-icon" />
            <span className="lp-footer-name">Sugar City Sweeps</span>
            <p className="lp-footer-tagline">Premium Sweepstakes Platform</p>
          </div>
          <div className="lp-footer-links">
            <div className="lp-footer-col">
              <h4>Platform</h4>
              <Link to="/register">Create Account</Link>
              <Link to="/login">Sign In</Link>
              <a href="#games">Games</a>
            </div>
            <div className="lp-footer-col">
              <h4>Legal</h4>
              <a href="/api/legal/terms" target="_blank" rel="noreferrer">Terms of Service</a>
              <a href="/api/legal/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
              <a href="/api/legal/responsible-gaming" target="_blank" rel="noreferrer">Responsible Gaming</a>
            </div>
            <div className="lp-footer-col">
              <h4>Support</h4>
              <Link to="/login">Help Center</Link>
              <span>support@sugarcitysweeps.com</span>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>Sugar City Sweeps. Must be 21+ to participate. No purchase necessary. Void where prohibited.</p>
          <p>National Gambling Helpline: 1-800-GAMBLER</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
