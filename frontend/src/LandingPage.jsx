import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, DollarSign, Gift, TrendingUp, Clock } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <Gift className="w-4 h-4" />
            <span>Get 100 FREE Credits Daily - No Purchase Required</span>
          </div>
          
          <h1 className="hero-title">
            Sugar City Sweeps
          </h1>
          
          <p className="hero-subtitle">
            Premium Sweepstakes Platform • 11 Games • Bitcoin Payouts
          </p>
          
          <div className="hero-buttons">
            <Link to="/register" className="btn-primary-large">
              Start Playing Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="btn-secondary-large">
              Sign In
            </Link>
          </div>
          
          <div className="hero-features">
            <div className="feature-pill">
              <Zap className="w-4 h-4" />
              <span>Instant Deposits</span>
            </div>
            <div className="feature-pill">
              <Shield className="w-4 h-4" />
              <span>Legal & Compliant</span>
            </div>
            <div className="feature-pill">
              <DollarSign className="w-4 h-4" />
              <span>Bitcoin Withdrawals</span>
            </div>
          </div>
        </div>
      </section>

      {/* Games Section */}
      <section className="games-showcase">
        <div className="section-header-landing">
          <h2>11 Premium Game Platforms</h2>
          <p>Choose from the best sweepstakes games in the industry</p>
        </div>
        
        <div className="games-grid-landing">
          {GAME_PLATFORMS.map(game => (
            <div key={game.id} className="game-card-premium">
              <div className="game-card-image" style={{background: game.gradient}}>
                <span className="game-icon">{game.icon}</span>
              </div>
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <div className="game-card-footer">
                <span className="game-status">🟢 Available</span>
                <Link to="/register" className="game-card-btn">Play Now</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>How Sugar City Sweeps Works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Claim Free Credits</h3>
            <p>Get 100 free credits every 24 hours. No purchase necessary!</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Purchase Sugar Tokens</h3>
            <p>Buy tokens and receive 100% bonus game credits instantly</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Play Your Favorites</h3>
            <p>Choose from 11 premium platforms like Fire Kirin, Juwa, and more</p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h3>Cash Out in Bitcoin</h3>
            <p>Redeem your winnings directly to your Bitcoin wallet</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Win Big?</h2>
          <p>Join thousands of players winning real Bitcoin every day</p>
          <Link to="/register" className="btn-primary-large">
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

const GAME_PLATFORMS = [
  { id: 1, name: 'Fire Kirin', icon: '🔥', description: 'Classic fish shooting game', gradient: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)' },
  { id: 2, name: 'Juwa', icon: '🎰', description: 'Premium slot collection', gradient: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)' },
  { id: 3, name: 'Orion Stars', icon: '⭐', description: 'Galaxy-themed slots', gradient: 'linear-gradient(135deg, #9D50BB 0%, #6E48AA 100%)' },
  { id: 4, name: 'Ultra Panda', icon: '🐼', description: 'Action-packed arcade', gradient: 'linear-gradient(135deg, #FF1493 0%, #C71585 100%)' },
  { id: 5, name: 'Panda Master', icon: '🎋', description: 'Skill-based gaming', gradient: 'linear-gradient(135deg, #32CD32 0%, #228B22 100%)' },
  { id: 6, name: 'Game Vault', icon: '🏆', description: 'Trophy collection', gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' },
  { id: 7, name: 'Milky Way', icon: '🌌', description: 'Space adventure', gradient: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)' },
  { id: 8, name: 'vBlink', icon: '💎', description: 'Gem matching mania', gradient: 'linear-gradient(135deg, #00F5FF 0%, #00CED1 100%)' },
  { id: 9, name: 'Noble', icon: '👑', description: 'Royal fortune', gradient: 'linear-gradient(135deg, #DAA520 0%, #B8860B 100%)' },
  { id: 10, name: 'Vegas X', icon: '🎲', description: 'Vegas-style classics', gradient: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)' },
  { id: 11, name: 'River Sweeps', icon: '🌊', description: 'River adventure', gradient: 'linear-gradient(135deg, #1E90FF 0%, #4169E1 100%)' },
];

export default LandingPage;
