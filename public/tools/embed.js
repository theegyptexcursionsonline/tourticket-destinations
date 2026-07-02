/*!
 * Foxes free-tools embed loader (v2)
 * One line on any website renders the tool:
 *
 *   <script src="https://<tools-host>/embed.js" data-tool="trip-cost-calculator" async></script>
 *
 * The brand (name, colors, CTA) is resolved from the DOMAIN THIS FILE WAS
 * SERVED FROM; the credit link under the widget comes from the central tools
 * API, rotated per embedding host. Pricing config also refreshes from the API
 * so every embed updates when prices change — the local tables below are the
 * offline fallback. Pure logic is exported for Node tests.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------- pricing */

  var VISA_PER_PERSON = 25; // Egypt e-visa, USD
  var FLIGHT_ADDON = 110; // internal hop (Cairo↔Luxor/Red Sea), per person
  var RANGE_PCT = 0.12;

  var STYLES = {
    budget: { label: 'Budget', hotel: 25, food: 12, transport: 8, activities: 15 },
    comfort: { label: 'Comfort', hotel: 70, food: 25, transport: 15, activities: 35 },
    luxury: { label: 'Luxury', hotel: 180, food: 60, transport: 40, activities: 80 }
  };

  var REGIONS = {
    cairo: { label: 'Cairo & Giza', hotel: 1.1, food: 1.0, transport: 1.0, activities: 1.1 },
    luxor: { label: 'Luxor & Aswan', hotel: 0.9, food: 0.9, transport: 1.0, activities: 1.3 },
    redsea: { label: 'Hurghada / Red Sea', hotel: 0.85, food: 0.85, transport: 0.9, activities: 1.0 },
    sinai: { label: 'Sharm & Sinai', hotel: 0.9, food: 0.9, transport: 0.9, activities: 1.05 },
    combo: { label: 'Nile + Red Sea combo', hotel: 1.0, food: 0.95, transport: 1.25, activities: 1.15 }
  };

  var SEASONS = {
    peak: { label: 'Peak (Oct–Apr)', mult: 1.15 },
    shoulder: { label: 'Shoulder (May & Sep)', mult: 1.0 },
    summer: { label: 'Summer (Jun–Aug)', mult: 0.85 }
  };

  // Brand registry — matched against the host this script was served from.
  var BRAND_DEFS = [
    {
      id: 'eeo',
      name: 'Egypt Excursions Online',
      url: 'https://egypt-excursionsonline.com',
      accent: '#E05D1A',
      accentDark: '#B34712',
      hosts: ['egypt-excursionsonline.com', 'eeo-free-tools.netlify.app'],
      links: [{ name: 'Egypt Excursions Online', url: 'https://egypt-excursionsonline.com' }]
    },
    {
      id: 'heo',
      name: 'Hurghada Speedboat',
      url: 'https://hurghadaspeedboat.com',
      accent: '#0E9AA7',
      accentDark: '#0B7680',
      hosts: ['hurghadaspeedboat.com', 'hurghada-free-tools.netlify.app'],
      links: [{ name: 'Hurghada Speedboat', url: 'https://hurghadaspeedboat.com' }]
    }
  ];

  var DEFAULT_BRAND = {
    id: 'default',
    name: 'Free Travel Tools',
    url: null,
    accent: '#2563EB',
    accentDark: '#1D4ED8',
    hosts: [],
    links: []
  };

  function clamp(n, min, max) {
    n = parseInt(n, 10);
    if (isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  /** Pure v2 pricing — side-effect free so it can be unit-tested in Node. */
  function computeTripCost(input) {
    input = input || {};
    var days = clamp(input.days == null ? 7 : input.days, 1, 30);
    var travelers = clamp(input.travelers == null ? 2 : input.travelers, 1, 12);
    var styleKey = STYLES[input.style] ? input.style : 'comfort';
    var regionKey = REGIONS[input.region] ? input.region : 'cairo';
    var seasonKey = SEASONS[input.season] ? input.season : 'peak';
    var flight = !!input.flight;

    var s = STYLES[styleKey];
    var r = REGIONS[regionKey];
    var m = SEASONS[seasonKey].mult;

    var transport = s.transport * r.transport * (travelers >= 3 ? 0.85 : 1);
    var breakdown = {
      hotel: s.hotel * r.hotel * m,
      food: s.food * r.food,
      transport: transport,
      activities: s.activities * r.activities * m
    };
    var perDay = breakdown.hotel + breakdown.food + breakdown.transport + breakdown.activities;
    var extras = VISA_PER_PERSON + (flight ? FLIGHT_ADDON : 0);
    var perPerson = Math.round(perDay * days + extras);
    var total = perPerson * travelers;
    var round10 = function (n) { return Math.round(n / 10) * 10; };
    return {
      days: days, travelers: travelers, style: styleKey, region: regionKey, season: seasonKey, flight: flight,
      perDay: perDay, breakdown: breakdown,
      visa: VISA_PER_PERSON, flightAddon: flight ? FLIGHT_ADDON : 0,
      perPerson: perPerson, total: total,
      range: { low: round10(total * (1 - RANGE_PCT)), high: round10(total * (1 + RANGE_PCT)) }
    };
  }

  /** Which brand does a host belong to? Exact or suffix match; default otherwise. */
  function resolveBrand(host) {
    host = String(host || '').toLowerCase().replace(/:\d+$/, '');
    for (var i = 0; i < BRAND_DEFS.length; i++) {
      var hosts = BRAND_DEFS[i].hosts;
      for (var j = 0; j < hosts.length; j++) {
        if (host === hosts[j] || host.slice(-(hosts[j].length + 1)) === '.' + hosts[j]) {
          return BRAND_DEFS[i];
        }
      }
    }
    return DEFAULT_BRAND;
  }

  function fmt(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  /* --------------------------------------------------- Node test exports */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      computeTripCost: computeTripCost,
      resolveBrand: resolveBrand,
      brands: BRAND_DEFS,
      DEFAULT_BRAND: DEFAULT_BRAND,
      STYLES: STYLES,
      REGIONS: REGIONS,
      SEASONS: SEASONS,
      VISA_PER_PERSON: VISA_PER_PERSON,
      FLIGHT_ADDON: FLIGHT_ADDON
    };
    return; // never touch the DOM under Node
  }

  /* ---------------------------------------------------------------- DOM */

  var TOOLS_API = 'https://foxes-tools-api-production.up.railway.app';

  var script =
    document.currentScript ||
    (function () {
      var st = document.getElementsByTagName('script');
      return st[st.length - 1];
    })();

  function widgetCss(brand) {
    var a = brand.accent, ad = brand.accentDark;
    return (
      ':host{all:initial}' +
      '*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Arial,sans-serif}' +
      '.card{background:#fff;border:1px solid #E8E5DF;border-radius:18px;max-width:440px;width:100%;' +
      'box-shadow:0 18px 50px -20px rgba(20,24,40,.25);overflow:hidden;color:#141824}' +
      '.hd{padding:18px 20px 12px}' +
      '.hdrow{display:flex;justify-content:space-between;align-items:center}' +
      '.pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.12em;color:' + ad + ';' +
      'background:' + a + '1A;border-radius:20px;padding:3px 10px;text-transform:uppercase}' +
      '.yr{font-size:10px;font-weight:600;letter-spacing:.08em;color:#A9AEB9;text-transform:uppercase}' +
      'h2{font-size:18px;font-weight:700;margin-top:8px;letter-spacing:-.01em}' +
      '.sub{font-size:12px;color:#7A7F8C;margin-top:3px}' +
      '.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:2px 20px 0}' +
      '.f label{display:block;font-size:10.5px;font-weight:600;color:#7A7F8C;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}' +
      'select{width:100%;border:1px solid #E8E5DF;border-radius:12px;background:#fff;padding:8px 10px;font-size:13px;font-weight:500;color:#2A2F3A;outline:none}' +
      '.stepbox{border:1px solid #E8E5DF;border-radius:12px;padding:8px 10px}' +
      '.step{display:flex;align-items:center;justify-content:space-between;margin-top:2px}' +
      '.step b{font-size:17px}' +
      '.step button{width:26px;height:26px;border-radius:8px;border:1px solid #E0DCD4;background:#FAF9F7;' +
      'font-size:15px;font-weight:600;cursor:pointer;line-height:1}' +
      '.seg{display:flex;gap:8px;padding:12px 20px 0}' +
      '.seg button{flex:1;border:1px solid #E8E5DF;background:#fff;border-radius:12px;padding:7px 4px;cursor:pointer;text-align:center}' +
      '.seg button .nm{display:block;font-size:12.5px;font-weight:600;color:#7A7F8C}' +
      '.seg button .pp{display:block;font-size:10.5px;color:#A9AEB9;margin-top:2px}' +
      '.seg button.on{border-color:' + a + ';background:' + a + '10}' +
      '.seg button.on .nm,.seg button.on .pp{color:' + ad + '}' +
      '.tog{display:flex;align-items:center;justify-content:space-between;padding:12px 20px 0;cursor:pointer}' +
      '.tog .t{font-size:13px;color:#3A4150}.tog .t small{color:#A9AEB9}' +
      '.sw{position:relative;width:42px;height:24px;border-radius:20px;background:#E2E8F0;transition:background .15s;flex-shrink:0}' +
      '.sw i{position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}' +
      '.sw.on{background:' + a + '}.sw.on i{left:20px}' +
      '.rows{padding:14px 20px 0}' +
      '.row{margin-bottom:9px}' +
      '.rt{display:flex;justify-content:space-between;font-size:11.5px;color:#7A7F8C}' +
      '.rt em{font-style:normal;font-weight:600;color:#3A4150}' +
      '.bar{height:6px;border-radius:6px;background:#F0EEE9;margin-top:4px;overflow:hidden}' +
      '.bar i{display:block;height:100%;border-radius:6px;background:' + a + ';transition:width .25s ease}' +
      '.note{font-size:10.5px;color:#A9AEB9;padding:2px 20px 6px}' +
      '.res{margin-top:10px;padding:14px 20px 16px;background:' + a + ';color:#fff;display:flex;justify-content:space-between;align-items:flex-end;gap:10px}' +
      '.res .lbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.8}' +
      '.res .rng{font-size:22px;font-weight:800;letter-spacing:-.02em;margin-top:2px;white-space:nowrap}' +
      '.res .side{text-align:right;font-size:11px;opacity:.92;line-height:1.5}' +
      '.cta{display:block;text-align:center;background:' + ad + ';color:#fff;text-decoration:none;' +
      'font-size:13.5px;font-weight:600;padding:11px 14px}' +
      '.ft{padding:10px 14px;background:#FBFAF8;border-top:1px solid #F0EEE9;font-size:11px;color:#8A8F9C;text-align:center}' +
      '.ft a{color:' + ad + ';font-weight:600;text-decoration:none}' +
      '.ft a:hover{text-decoration:underline}'
    );
  }

  function optionsHtml(map, selected) {
    var out = '';
    for (var k in map) {
      out += '<option value="' + k + '"' + (k === selected ? ' selected' : '') + '>' + map[k].label + '</option>';
    }
    return out;
  }

  function widgetHtml(brand) {
    var creditLinks = (brand.links && brand.links.length ? brand.links : [{ name: brand.name, url: brand.url || '#' }])
      .slice(0, 1)
      .map(function (l) { return '<a href="' + l.url + '" target="_blank" rel="noopener">' + l.name + '</a>'; })
      .join(' · ');
    return (
      '<div class="card">' +
      '<div class="hd"><div class="hdrow"><span class="pill">Free tool</span><span class="yr">2026 prices</span></div>' +
      '<h2>Egypt Trip Cost Calculator</h2>' +
      '<div class="sub">Real daily prices from local operators.</div></div>' +
      '<div class="row2">' +
      '<div class="f"><label>Destination</label><select data-region>' + optionsHtml(REGIONS, 'cairo') + '</select></div>' +
      '<div class="f"><label>When</label><select data-season>' + optionsHtml(SEASONS, 'peak') + '</select></div>' +
      '</div>' +
      '<div class="row2" style="padding-top:10px">' +
      '<div class="f stepbox"><label>Days</label><div class="step"><button type="button" data-a="d-">−</button><b data-days>7</b><button type="button" data-a="d+">+</button></div></div>' +
      '<div class="f stepbox"><label>Travellers</label><div class="step"><button type="button" data-a="t-">−</button><b data-trav>2</b><button type="button" data-a="t+">+</button></div></div>' +
      '</div>' +
      '<div class="seg" data-seg></div>' +
      '<div class="tog" data-tog><span class="t">Internal flight <small>(Cairo ↔ Luxor / Red Sea)</small></span><span class="sw" data-sw><i></i></span></div>' +
      '<div class="rows">' +
      '<div class="row"><div class="rt"><span>Hotels</span><em data-val="hotel"></em></div><div class="bar"><i data-bar="hotel"></i></div></div>' +
      '<div class="row"><div class="rt"><span>Food &amp; drinks</span><em data-val="food"></em></div><div class="bar"><i data-bar="food"></i></div></div>' +
      '<div class="row"><div class="rt"><span>Getting around</span><em data-val="transport"></em></div><div class="bar"><i data-bar="transport"></i></div></div>' +
      '<div class="row"><div class="rt"><span>Tours &amp; tickets</span><em data-val="activities"></em></div><div class="bar"><i data-bar="activities"></i></div></div>' +
      '</div>' +
      '<div class="note" data-note></div>' +
      '<div class="res"><div><div class="lbl">Estimated total</div><div class="rng" data-range></div></div>' +
      '<div class="side" data-side></div></div>' +
      (brand.url
        ? '<a class="cta" href="' + brand.url + '" target="_blank" rel="noopener">Explore Egypt tours with ' + brand.name + ' →</a>'
        : '') +
      '<div class="ft">⚡ Free tool by ' + creditLinks + '</div>' +
      '</div>'
    );
  }

  function mountTripCost(scriptEl) {
    var srcHost;
    try {
      srcHost = new URL(scriptEl.src, window.location.href).host;
    } catch (e) {
      srcHost = window.location.host;
    }
    var brand = resolveBrand(srcHost);

    var wrap = document.createElement('div');
    wrap.setAttribute('data-foxes-tool', 'trip-cost-calculator');
    scriptEl.insertAdjacentElement('afterend', wrap);

    var root = wrap.attachShadow ? wrap.attachShadow({ mode: 'open' }) : wrap;
    var styleEl = document.createElement('style');
    styleEl.textContent = widgetCss(brand);
    var box = document.createElement('div');
    box.innerHTML = widgetHtml(brand);
    root.appendChild(styleEl);
    root.appendChild(box);

    var state = { days: 7, travelers: 2, style: 'comfort', region: 'cairo', season: 'peak', flight: false };
    var q = function (sel) { return box.querySelector(sel); };

    function renderSeg() {
      var seg = q('[data-seg]');
      var html = '';
      for (var k in STYLES) {
        var alt = computeTripCost({ days: state.days, travelers: state.travelers, style: k, region: state.region, season: state.season, flight: state.flight });
        html += '<button type="button" data-style="' + k + '" class="' + (state.style === k ? 'on' : '') + '">' +
          '<span class="nm">' + STYLES[k].label + '</span><span class="pp">' + fmt(alt.perPerson) + '/pp</span></button>';
      }
      seg.innerHTML = html;
    }

    function update() {
      var r = computeTripCost(state);
      q('[data-days]').textContent = r.days;
      q('[data-trav]').textContent = r.travelers;
      q('[data-range]').textContent = fmt(r.range.low) + ' – ' + fmt(r.range.high);
      q('[data-side]').innerHTML = '≈ ' + fmt(r.perPerson) + ' per person<br>' + r.travelers + ' traveller' + (r.travelers > 1 ? 's' : '') + ' · ' + r.days + ' days';
      ['hotel', 'food', 'transport', 'activities'].forEach(function (k) {
        q('[data-bar="' + k + '"]').style.width = Math.round((r.breakdown[k] / r.perDay) * 100) + '%';
        q('[data-val="' + k + '"]').textContent = fmt(r.breakdown[k]) + '/day';
      });
      q('[data-note]').textContent = '+ ' + fmt(r.visa) + ' e-visa' + (r.flight ? ' + ' + fmt(r.flightAddon) + ' internal flight' : '') + ' per person · excludes international flights';
      q('[data-sw]').className = 'sw' + (state.flight ? ' on' : '');
      renderSeg();
    }

    box.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!(t instanceof Element)) return;
      var b = t.closest('button');
      var a = b && b.getAttribute('data-a');
      var st = b && b.getAttribute('data-style');
      if (a === 'd+') state.days = clamp(state.days + 1, 1, 30);
      if (a === 'd-') state.days = clamp(state.days - 1, 1, 30);
      if (a === 't+') state.travelers = clamp(state.travelers + 1, 1, 12);
      if (a === 't-') state.travelers = clamp(state.travelers - 1, 1, 12);
      if (st) state.style = st;
      var tog = t.closest('[data-tog]');
      if (tog) state.flight = !state.flight;
      if (a || st || tog) update();
    });
    box.addEventListener('change', function (ev) {
      var t = ev.target;
      if (!(t instanceof Element)) return;
      if (t.hasAttribute('data-region')) { state.region = t.value; update(); }
      if (t.hasAttribute('data-season')) { state.season = t.value; update(); }
    });

    update();

    // Central config: fresh pricing + the rotated credit link for THIS host.
    try {
      fetch(TOOLS_API + '/v1/tools/trip-cost-calculator/config?host=' + encodeURIComponent(window.location.hostname))
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (cfg) {
          if (!cfg) return;
          if (cfg.styles) STYLES = cfg.styles;
          if (cfg.regions) REGIONS = cfg.regions;
          if (cfg.seasons) SEASONS = cfg.seasons;
          if (cfg.visaPerPerson) VISA_PER_PERSON = cfg.visaPerPerson;
          if (cfg.flightAddon) FLIGHT_ADDON = cfg.flightAddon;
          if (cfg.links && cfg.links.length) {
            var ft = box.querySelector('.ft');
            if (ft) {
              ft.innerHTML = '⚡ Free tool by ' + cfg.links.map(function (l) {
                return '<a href="' + l.url + '" target="_blank" rel="noopener">' + l.name + '</a>';
              }).join(' · ');
            }
          }
          update();
        })
        .catch(function () { /* local tables already rendered */ });
    } catch (e) { /* never break the host page */ }
  }

  var tool = script && script.getAttribute('data-tool');
  if (tool === 'trip-cost-calculator') {
    if (document.body) mountTripCost(script);
    else document.addEventListener('DOMContentLoaded', function () { mountTripCost(script); });
  } else if (script) {
    console.error('[foxes-tools] embed.js: unknown or missing data-tool');
  }
})();
