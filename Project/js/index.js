

  // Redirect if already logged in
  (function(){
    const s = sessionStorage.getItem('erms_session');
    if (s) { const u = JSON.parse(s); window.location.href = u.role + '.html'; }
  })();
  // Note: patient role → patient.html, others → their role .html

  function quickFill(u, p) {
    document.getElementById('username').value = u;
    document.getElementById('password').value = p;
    document.getElementById('errorMsg').classList.remove('show');
  }

  function togglePassword() {
    const pwd  = document.getElementById('password');
    const icon = document.getElementById('togglePwd');
    if (pwd.type === 'password') { pwd.type = 'text';     icon.className = 'ti ti-eye-off input-toggle'; }
    else                          { pwd.type = 'password'; icon.className = 'ti ti-eye input-toggle'; }
  }

  function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn      = document.getElementById('loginBtn');
    const errEl    = document.getElementById('errorMsg');

    errEl.classList.remove('show');

    if (!username || !password) {
      document.getElementById('errorText').textContent = 'Please enter both username and password.';
      errEl.classList.add('show'); return;
    }

    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader-2 spin"></i> Authenticating…';

    // Small UX delay then login (synchronous, no fetch)
    setTimeout(function() {
      const result = doLogin(username, password);
      if (result.success) {
        btn.innerHTML = '<i class="ti ti-check"></i> Access Granted!';
        btn.style.background = '#16A34A';
        setTimeout(function() {
          window.location.href = result.user.role + '.html';
        }, 500);
      } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-login"></i> Sign In to Dashboard';
        btn.style.background = '';
        document.getElementById('errorText').textContent = result.error;
        errEl.classList.add('show');
      }
    }, 600);
  }

  document.addEventListener('keydown', function(e) { if (e.key === 'Enter') handleLogin(); });
