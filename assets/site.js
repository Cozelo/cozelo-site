// ---- Mobile navigation ----
(function(){
  var mnav = document.getElementById('mnav'),
      burger = document.getElementById('mburger'),
      menu = document.getElementById('mmenu');
  if (!mnav || !burger || !menu) return;
  var open = false;

  function setOpen(v){
    open = v;
    menu.classList.toggle('on', v);
    document.body.classList.toggle('menu-open', v);
    burger.setAttribute('aria-expanded', String(v));
    burger.setAttribute('aria-label', v ? 'Close menu' : 'Open menu');
    if (v) { menu.querySelector('.mlink').focus({preventScroll:true}); }
    else   { burger.focus({preventScroll:true}); }
  }
  burger.addEventListener('click', function(){ setOpen(!open) });
  menu.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){ setOpen(false) });
  });
  document.addEventListener('keydown', function(e){
    if (!open) return;
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key !== 'Tab') return;
    var items = [].slice.call(menu.querySelectorAll('a')).concat([burger]);
    var i = items.indexOf(document.activeElement);
    if (i === -1) return;
    var next = e.shiftKey ? i - 1 : i + 1;
    if (next < 0) next = items.length - 1;
    if (next >= items.length) next = 0;
    items[next].focus(); e.preventDefault();
  });

  var last = 0, ticking = false, THRESHOLD = 9;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.addEventListener('scroll', function(){
    if (reduce || open || ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      var y = window.pageYOffset, dy = y - last;
      if (Math.abs(dy) > THRESHOLD) { mnav.classList.toggle('up', dy > 0 && y > 60); last = y; }
      ticking = false;
    });
  }, {passive:true});
})();

// Arrow reset: run the return leg only after a real hover, never on load.
document.querySelectorAll('.btn--primary').forEach(function(b){
  var t;
  function reset(){ clearTimeout(t); b.classList.add('is-resetting');
    t = setTimeout(function(){ b.classList.remove('is-resetting') }, 380); }
  b.addEventListener('mouseleave', reset);
  b.addEventListener('blur', reset);
  b.addEventListener('mouseenter', function(){ clearTimeout(t); b.classList.remove('is-resetting') });
});

// ---- Rail: track the section in view ----
// Marks the current page's section in the rail (gold marker via CSS, and
// aria-current="location"). A section is current once its top passes 40% of
// the viewport; nothing is marked while the hero is still in view.
(function(){
  var links = [].slice.call(document.querySelectorAll('.rail__toc a'));
  if (!links.length) return;
  var sections = links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); });
  var current = null, ticking = false;
  function sync(){
    var line = window.innerHeight * 0.4, next = null;
    sections.forEach(function(sec, i){ if (sec && sec.getBoundingClientRect().top <= line) next = links[i]; });
    if (next === current) return;
    if (current) current.removeAttribute('aria-current');
    if (next) next.setAttribute('aria-current', 'location');
    current = next;
  }
  window.addEventListener('scroll', function(){
    if (!ticking){ ticking = true; requestAnimationFrame(function(){ sync(); ticking = false; }); }
  }, {passive:true});
  window.addEventListener('resize', sync);
  sync();
})();
