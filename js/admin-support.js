// Admin > Bantuan & Sosial
(function () {
  'use strict';

  const firstField = document.getElementById('supportWhatsApp');
  if (!firstField) return;

  const els = {
    whatsapp: document.getElementById('supportWhatsApp'),
    telegram: document.getElementById('supportTelegram'),
    tiktok: document.getElementById('supportTikTok'),
    threads: document.getElementById('supportThreads'),
    reseller: document.getElementById('supportReseller'),
    saveBtn: document.getElementById('btnSaveSupportLinks'),
    status: document.getElementById('supportStatusBadge'),
    previewHelpSub: document.getElementById('previewHelpSub'),
    previewWaRow: document.getElementById('previewWaRow'),
    previewWaValue: document.getElementById('previewWaValue'),
    previewTgRow: document.getElementById('previewTgRow'),
    previewTgValue: document.getElementById('previewTgValue'),
  };

  function prettyNumber(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('62') && digits.length > 8) {
      const rest = digits.slice(2);
      const grouped = rest.replace(/(\d{3})(\d{3,4})(\d{0,4}).*/, '$1-$2-$3').replace(/-$/, '');
      return '+62 ' + grouped;
    }
    if (digits.startsWith('0') && digits.length > 8) {
      return prettyNumber('62' + digits.slice(1));
    }
    return '+' + digits;
  }

  function telegramValue(raw) {
    const value = String(raw || '').trim().replace(/^@/, '');
    if (!value) return '';
    const match = value.match(/t\.me\/([A-Za-z0-9_]+)/i);
    if (match) return '@' + match[1];
    return '@' + value;
  }

  function setStatus(text, color) {
    if (!els.status) return;
    els.status.textContent = text;
    els.status.style.color = color;
  }

  function markDirty() {
    setStatus('● Perubahan belum disimpan', '#fbbf24');
  }

  function updatePreview() {
    const number = prettyNumber(els.whatsapp.value);
    const telegram = telegramValue(els.telegram.value);

    if (els.previewWaRow) els.previewWaRow.style.display = number ? '' : 'none';
    if (els.previewWaValue) els.previewWaValue.textContent = number || 'WhatsApp CS';
    if (els.previewTgRow) els.previewTgRow.style.display = telegram ? '' : 'none';
    if (els.previewTgValue) els.previewTgValue.textContent = telegram || 'Telegram CS';

    if (els.previewHelpSub) {
      let sub = 'Live chat • Respon cepat 24/7';
      if (number && telegram) sub = 'WhatsApp & Telegram • Respon cepat 24/7';
      else if (number) sub = `WhatsApp • ${number} • Respon cepat 24/7`;
      else if (telegram) sub = `Telegram • ${telegram} • Respon cepat 24/7`;
      els.previewHelpSub.textContent = sub;
    }

    const socialState = {
      tiktok: els.tiktok.value.trim(),
      threads: els.threads.value.trim(),
    };
    document.querySelectorAll('[data-preview-social]').forEach((el) => {
      el.style.display = socialState[el.dataset.previewSocial] ? '' : 'none';
    });
  }

  function fill(data) {
    els.whatsapp.value = data.whatsapp_number || '';
    els.telegram.value = data.telegram_username ? '@' + data.telegram_username : '';
    els.tiktok.value = data.tiktok_url || '';
    els.threads.value = data.threads_url || '';
    els.reseller.value = data.reseller_url || '';
    updatePreview();
    setStatus('● Tersinkron', '#34d399');
  }

  async function load() {
    try {
      const res = await adminFetch('/api/admin/support-links');
      if (!res) return;
      const json = await res.json();
      if (json.success && json.data) {
        fill(json.data);
      } else {
        setStatus('● Gagal memuat', '#f87171');
      }
    } catch (err) {
      setStatus('● Gagal memuat', '#f87171');
    }
  }

  async function save() {
    if (!els.saveBtn) return;
    els.saveBtn.disabled = true;
    const original = els.saveBtn.textContent;
    els.saveBtn.textContent = 'Menyimpan...';
    setStatus('● Menyimpan...', '#60a5fa');

    const payload = {
      whatsapp_number: els.whatsapp.value.trim(),
      telegram_username: els.telegram.value.trim(),
      tiktok_url: els.tiktok.value.trim(),
      threads_url: els.threads.value.trim(),
      reseller_url: els.reseller.value.trim(),
    };

    try {
      const res = await adminFetch('/api/admin/support-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res) return;
      const json = await res.json();
      if (json.success && json.data) {
        fill(json.data);
        showToast('Kanal Help CS & media sosial berhasil disimpan ✨');
      } else {
        setStatus('● Gagal menyimpan', '#f87171');
        alert(json.error || 'Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      setStatus('● Gagal menyimpan', '#f87171');
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      els.saveBtn.disabled = false;
      els.saveBtn.textContent = original;
    }
  }

  [els.whatsapp, els.telegram, els.tiktok, els.threads, els.reseller].forEach((el) => {
    el.addEventListener('input', () => {
      updatePreview();
      markDirty();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    });
  });

  els.saveBtn.addEventListener('click', save);

  load();
})();
