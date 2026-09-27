(function () {
  var cfg = window.PEL_CONFIG || { stripeLinks: {} };

  // Preview hosts do not serve folder index pages; production (Cloudflare Pages) does.
  if (!/plainenglishlibrary\.com$/.test(location.hostname) && location.hostname !== 'localhost') {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (/^(https?:|mailto:|#|\/)/.test(h)) return;
      var m = h.match(/^([^#?]*)([#?].*)?$/);
      if (m && (m[1] === '' || /\/$/.test(m[1]) || m[1] === './' || /(^|\/)\.\.$/.test(m[1]))) {
        var path = m[1] === '' ? '' : (/\/$/.test(m[1]) ? m[1] : m[1] + '/');
        if (m[1] === '' && !m[2]) return;
        a.setAttribute('href', path + 'index.html' + (m[2] || ''));
      }
    });
  }

  // Buy buttons
  document.querySelectorAll('[data-buy]').forEach(function (btn) {
    var link = (cfg.stripeLinks || {})[btn.getAttribute('data-buy')];
    if (link) {
      btn.setAttribute('href', link);
    } else {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var note = btn.closest('[data-buy-wrap]');
        note = note && note.querySelector('.checkout-note');
        if (note) note.textContent = 'Checkout is being connected. Please check back shortly.';
      });
    }
  });

  // Contact email
  document.querySelectorAll('[data-contact]').forEach(function (el) {
    el.textContent = cfg.contactEmail;
    if (el.tagName === 'A') el.href = 'mailto:' + cfg.contactEmail;
  });

  // Hide email-only promises until an email tool is connected
  if (!cfg.emailFormAction) {
    document.querySelectorAll('[data-if-email]').forEach(function (el) { el.remove(); });
  }

  // Free guide form
  var form = document.getElementById('lead-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('input[type=email]');
      var msg = form.querySelector('.form-msg');
      if (!email.value || !email.checkValidity()) {
        msg.textContent = 'Please enter a valid email address.';
        email.focus();
        return;
      }
      var success = document.getElementById('lead-success');
      var done = function (emailed) {
        if (!emailed) success.querySelectorAll('[data-if-email]').forEach(function (el) { el.remove(); });
        form.style.display = 'none';
        success.classList.add('show');
      };
      if (cfg.emailFormAction) {
        var first = form.querySelector('input[name=first]');
        var hp = form.querySelector('input[name=company]');
        var btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        msg.textContent = 'Sending...';
        fetch(cfg.emailFormAction, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.value, first: first ? first.value : '', company: hp ? hp.value : '' })
        })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, d: d }; }); })
          .then(function (x) {
            if (x.status === 400 && x.d && x.d.error) { msg.textContent = x.d.error; btn.disabled = false; email.focus(); return; }
            done(!!(x.d && x.d.emailed));
          })
          .catch(function () { done(false); });
      } else {
        done(false);
      }
    });
  }

  // Reveal on scroll
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
