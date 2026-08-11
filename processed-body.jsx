

<canvas id="noise"></canvas>
<div className="c-d" id="cd"></div>
<div className="c-r" id="cr"></div>

<!-- Preloader -->
<div className="pre" id="pre">
  <div className="pre-n" id="preN">0</div>
  <div className="pre-bar"><div className="pre-bar-i" id="preBar"></div></div>
  <div className="pre-l">initializing</div>
</div>

<!-- Nav -->
<nav className="nav" id="nav">
  <a href="#" className="nav-logo" data-m><i></i>depnoyed</a>
  <div className="nav-r">
    <a href="#system" className="nav-link" data-m>System</a>
    <a href="#engine" className="nav-link" data-m>Engine</a>
    <a href="#work" className="nav-link" data-m>Work</a>
    <button className="nav-cta" data-m>Get Started</button>
  </div>
</nav>

<!-- Hero -->
<section className="hero" id="hero">
  <canvas className="hero-canvas" id="heroCanvas"></canvas>
  <div className="hero-meta">
    <span>40.7128° N, 74.0060° W</span>
    <span>sys.status: operational</span>
    <span>v2.4.1 — build 847</span>
  </div>
  <div className="hero-content">
    <div className="hero-label" style={{opacity: "0"}}><span className="ln"></span>Infrastructure as experience — 2025</div>
    <h1 className="hero-title" id="heroTitle">
      <span className="ln"><span className="w"><span className="ch">D</span><span className="ch">e</span><span className="ch">p</span><span className="ch">l</span><span className="ch">o</span><span className="ch">y</span></span></span>
      <span className="ln"><span className="w"><span className="ch">w</span><span className="ch">i</span><span className="ch">t</span><span className="ch">h</span><span className="ch">o</span><span className="ch">u</span><span className="ch">t</span></span><span className="w accent"><span className="ch">f</span><span className="ch">r</span><span className="ch">i</span><span className="ch">c</span><span className="ch">t</span><span className="ch">i</span><span className="ch">o</span><span className="ch">n</span><span className="accent-bar"></span></span></span>
      <span className="ln"><span className="w"><span className="ch">s</span><span className="ch">c</span><span className="ch">a</span><span className="ch">l</span><span className="ch">e</span></span><span className="w"><span className="ch">w</span><span className="ch">i</span><span className="ch">t</span><span className="ch">h</span><span className="ch">o</span><span className="ch">u</span><span className="ch">t</span></span><span className="w"><span className="ch">l</span><span className="ch">i</span><span className="ch">m</span><span className="ch">i</span><span className="ch">t</span><span className="ch">.</span></span></span>
    </h1>
    <div className="hero-bot">
      <p className="hero-desc" style={{opacity: "0"}}>Open-source applications deployed in seconds. Persistent storage, automated networking, one-click infrastructure.</p>
      <div className="hero-acts" style={{opacity: "0"}}>
        <button className="btn-p" data-m><span>Explore Platform</span></button>
        <button className="btn-g" data-m>Sign In</button>
      </div>
    </div>
  </div>
  <div className="scroll-line" id="scrollLine"><span className="dot"></span></div>
</section>

<!-- Problem -->
<section className="s-problem" id="problem">
  <div className="problem-grid">
    <div>
      <div className="s-label"><span className="dash"></span>01 — The Problem</div>
      <h2 className="problem-head">Infrastructure should be invisible. Instead, it's the bottleneck.</h2>
      <div className="problem-text">
        <p>Teams spend weeks configuring Kubernetes clusters, managing reverse proxies, debugging Docker networking, and maintaining deployment pipelines.</p>
        <p>The tooling meant to accelerate development has become the thing that slows it down.</p>
      </div>
    </div>
    <div className="problem-visual">
      <div className="problem-diagram">
        <div className="node"><span className="icon"></span>Docker configuration</div>
        <div className="conn"></div>
        <div className="node"><span className="icon"></span>Kubernetes manifests</div>
        <div className="conn"></div>
        <div className="node"><span className="icon"></span>Ingress / reverse proxy</div>
        <div className="conn"></div>
        <div className="node"><span className="icon"></span>SSL certificates</div>
        <div className="conn"></div>
        <div className="node"><span className="icon"></span>Persistent volumes</div>
        <div className="conn"></div>
        <div className="node"><span className="icon"></span>Monitoring stack</div>
        <span className="problem-diagram-label">current workflow — 6 manual steps</span>
      </div>
    </div>
  </div>
</section>

<div className="divider"></div>

<!-- Shift (Sticky) -->
<section className="s-shift" id="shift">
  <div className="shift-sticky" id="shiftSticky">
    <div className="shift-pin">
      <div className="shift-inner">
        <div className="shift-left">
          <div className="shift-line"></div>
          <div className="shift-big">ONE CLICK</div>
          <div className="shift-words">
            <div className="shift-word" data-step="0"><span className="num">step 01</span>Choose your application</div>
            <div className="shift-word" data-step="1"><span className="num">step 02</span>Configure resources</div>
            <div className="shift-word" data-step="2"><span className="num">step 03</span>Deploy instantly</div>
            <div className="shift-word" data-step="3"><span className="num">step 04</span>It just works</div>
          </div>
        </div>
        <div className="shift-right">
          <div className="shift-right-text">
            <p data-step="0">Browse our verified marketplace of 200+ open-source applications. Each one tested, optimized, and ready for production.</p>
            <p data-step="1">Set CPU, memory, and storage with intuitive controls. No YAML. No Helm charts. No infrastructure-as-code files.</p>
            <p data-step="2">One click. That's it. Depnoyed handles provisioning, networking, SSL, and persistent storage automatically.</p>
            <p data-step="3">A running application with a public URL, monitoring dashboard, and automatic backups. Zero configuration.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- System -->
<section className="s-system" id="system">
  <div className="system-head">
    <div className="s-label"><span className="dash"></span>03 — The System</div>
    <h2 className="system-title">Three steps from <span className="hl">zero to production.</span></h2>
  </div>
  <div className="system-flow">
    <div className="flow-step">
      <div className="flow-step-num">01</div>
      <div className="flow-step-icon">◎</div>
      <h3 className="flow-step-title">Choose</h3>
      <p className="flow-step-desc">Find the open-source application you need from our verified marketplace catalog of 200+ production-ready tools.</p>
    </div>
    <div className="flow-step">
      <div className="flow-step-num">02</div>
      <div className="flow-step-icon">⚡</div>
      <h3 className="flow-step-title">Deploy</h3>
      <p className="flow-step-desc">Configure your instance resources and environment. Then deploy with a single click. No infrastructure knowledge required.</p>
    </div>
    <div className="flow-step">
      <div className="flow-step-num">03</div>
      <div className="flow-step-icon">→</div>
      <h3 className="flow-step-title">Use</h3>
      <p className="flow-step-desc">Get a ready-to-use application with persistent storage, a secure public URL, and real-time monitoring.</p>
    </div>
  </div>
</section>

<div className="divider"></div>

<!-- Engine -->
<section className="s-engine" id="engine">
  <div className="engine-grid">
    <div className="engine-code" id="engineCode">
      <div className="ln"><span className="k">apiVersion:</span> <span className="v">apps/v1</span></div>
      <div className="ln"><span className="k">kind:</span> <span className="v">Deployment</span></div>
      <div className="ln"><span className="k">metadata:</span></div>
      <div className="ln">&nbsp;&nbsp;<span className="k">name:</span> <span className="v">grafana-production</span></div>
      <div className="ln"><span className="k">spec:</span></div>
      <div className="ln">&nbsp;&nbsp;<span className="k">replicas:</span> <span className="v">1</span></div>
      <div className="ln">&nbsp;&nbsp;<span className="k">template:</span></div>
      <div className="ln">&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">spec:</span></div>
      <div className="ln">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">containers:</span></div>
      <div className="ln">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span className="k">name:</span> <span className="v">grafana</span></div>
      <div className="ln">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">image:</span> <span className="v">grafana/grafana:latest</span></div>
      <div className="ln">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">resources:</span></div>
      <div className="ln">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">limits:</span></div>
      <div className="ln">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">memory:</span> <span className="v">"1Gi"</span></div>
      <div className="ln">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="k">cpu:</span> <span className="v">"500m"</span></div>
      <div className="ln" style={{marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(216,212,204,.06)"}}><span className="c">// Depnoyed handles all of this automatically.</span></div>
    </div>
    <div>
      <div className="s-label"><span className="dash"></span>04 — The Engine</div>
      <h2 className="problem-head">Enterprise infrastructure,<br>abstracted.</h2>
      <div className="engine-feats">
        <div className="engine-feat">
          <div className="engine-feat-icon">⊞</div>
          <div><div className="engine-feat-title">Isolated Tenants</div><div className="engine-feat-desc">Every deployment runs in its own isolated environment with strict resource boundaries.</div></div>
        </div>
        <div className="engine-feat">
          <div className="engine-feat-icon">◉</div>
          <div><div className="engine-feat-title">Persistent Storage</div><div className="engine-feat-desc">Automatic persistent volume claims. Your data survives restarts, updates, and migrations.</div></div>
        </div>
        <div className="engine-feat">
          <div className="engine-feat-icon">◎</div>
          <div><div className="engine-feat-title">Automated Routing</div><div className="engine-feat-desc">Instant secure subdomains with automatic SSL. No ingress configuration required.</div></div>
        </div>
        <div className="engine-feat">
          <div className="engine-feat-icon">▤</div>
          <div><div className="engine-feat-title">Resource Limits</div><div className="engine-feat-desc">Strict CPU and memory limits prevent noisy-neighbor issues across the platform.</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<div className="divider"></div>

<!-- Experience -->
<section className="s-exp" id="work">
  <div className="exp-head">
    <div>
      <div className="s-label"><span className="dash"></span>05 — The Experience</div>
      <h2 className="exp-title">Production-ready<br>catalog.</h2>
    </div>
    <span className="exp-count">06 applications featured</span>
  </div>
  <div className="exp-grid">
    <div className="exp-item" data-m>
      <div className="exp-item-inner">
        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" alt="Grafana" loading="lazy">
        <div className="exp-item-over"><span className="exp-item-tag">Monitoring</span><span className="exp-item-name">Grafana Observability</span><span className="exp-item-meta">grafana.depnoyed.com</span></div>
      </div>
    </div>
    <div className="exp-item" data-m>
      <div className="exp-item-inner">
        <img src="https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80" alt="InfluxDB" loading="lazy">
        <div className="exp-item-over"><span className="exp-item-tag">Database</span><span className="exp-item-name">InfluxDB Time Series</span><span className="exp-item-meta">influx.depnoyed.com</span></div>
      </div>
    </div>
    <div className="exp-item" data-m>
      <div className="exp-item-inner">
        <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80" alt="Supabase" loading="lazy">
        <div className="exp-item-over"><span className="exp-item-tag">Backend</span><span className="exp-item-name">Supabase Platform</span><span className="exp-item-meta">supabase.depnoyed.com</span></div>
      </div>
    </div>
    <div className="exp-item" data-m>
      <div className="exp-item-inner">
        <img src="https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800&q=80" alt="MinIO" loading="lazy">
        <div className="exp-item-over"><span className="exp-item-tag">Storage</span><span className="exp-item-name">MinIO Object Store</span><span className="exp-item-meta">minio.depnoyed.com</span></div>
      </div>
    </div>
  </div>
</section>

<div className="divider"></div>

<!-- Scale -->
<section className="s-scale" id="scale">
  <div className="scale-head">
    <div className="s-label" style={{justifyContent: "center"}}><span className="dash"></span>06 — The Scale<span className="dash"></span></div>
    <h2 className="scale-title">Numbers that speak.</h2>
  </div>
  <div className="scale-grid">
    <div className="scale-cell"><div className="scale-num"><span className="counter" data-target="12">0</span><span className="unit">K+</span></div><div className="scale-label">Deployments</div></div>
    <div className="scale-cell"><div className="scale-num"><span className="counter" data-target="99.9" data-dec="1">0</span><span className="unit">%</span></div><div className="scale-label">Uptime SLA</div></div>
    <div className="scale-cell"><div className="scale-num"><span className="counter" data-target="200">0</span><span className="unit">+</span></div><div className="scale-label">Applications</div></div>
    <div className="scale-cell"><div className="scale-num"><span className="counter" data-target="45">0</span><span className="unit">s</span></div><div className="scale-label">Avg Deploy</div></div>
  </div>
</section>

<!-- Future -->
<section className="s-future">
  <div className="future-bg" id="futureBg">FRICTIONLESS</div>
  <div className="future-content">
    <div className="s-label" style={{justifyContent: "center"}}><span className="dash"></span>07 — The Future<span className="dash"></span></div>
    <h2 className="future-title">Stop configuring.<br><span className="accent">Start building.</span></h2>
    <p className="future-desc">Join thousands of developers who've replaced weeks of infrastructure work with a single click.</p>
    <button className="btn-p" data-m><span>Create Free Account</span></button>
  </div>
</section>

<!-- Footer -->
<footer className="foot">
  <div className="foot-inner">
    <span className="foot-logo"><i></i>depnoyed</span>
    <span className="foot-copy">© 2025 depnoyed. all rights reserved.</span>
    <ul className="foot-links">
      <li><a href="#" className="foot-link" data-m>twitter</a></li>
      <li><a href="#" className="foot-link" data-m>github</a></li>
      <li><a href="#" className="foot-link" data-m>discord</a></li>
    </ul>
  </div>
</footer>

