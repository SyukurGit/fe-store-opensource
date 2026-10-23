// Admin > Bantuan & Sosial
(function () {
  'use strict';

  const form = document.getElementById('supportWhatsApp');
  if (!form) return;

  const els = {
    whatsapp: document.getElementById('supportWhatsApp'),
    tiktok: document.getElementById('supportTikTok'),
    threads: document.getElementById('supportThreads'),
    whatsappSocial: document.getElementById('supportWhatsAppSocial'),
    reseller: document.getElementById('supportReseller'),
    saveBtn: document.getElementById('btnSaveSupportLinks'),
    status: document.getElementById('supportStatusBadge'),
    previewHelpSub: document.getElementById('previewHelpSub'),
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
      const rest = '62' + digits.slice(1);
      return prettyNumber(rest);
    }
    return '+' + digits;
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
    if (els.previewHelpSub) {
      els.previewHelpSub.textContent = number
        ? `WhatsApp • ${number} • Respon cepat 24/7`
        : 'Live chat • Respon cepat 24/7';
    }

    const socialState = {
      tiktok: els.tiktok.value.trim(),
      threads: els.threads.value.trim(),
      whatsapp: els.whatsappSocial.value.trim() || els.whatsapp.value.trim(),
    };
    document.querySelectorAll('[data-preview-social]').forEach((el) => {
      el.style.display = socialState[el.dataset.previewSocial] ? '' : 'none';
    });
  }

  function fill(data) {
    els.whatsapp.value = data.whatsapp_number || '';
    els.tiktok.value = data.tiktok_url || '';
    els.threads.value = data.threads_url || '';
    els.whatsappSocial.value = data.whatsapp_social_url || '';
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
      tiktok_url: els.tiktok.value.trim(),
      threads_url: els.threads.value.trim(),
      whatsapp_social_url: els.whatsappSocial.value.trim(),
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
        showToast('Link bantuan & media sosial berhasil disimpan ✨');
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

  [els.whatsapp, els.tiktok, els.threads, els.whatsappSocial, els.reseller].forEach((el) => {
    el.addEventListener('input', () => {
      updatePreview();
      markDirty();
    });
  });

  els.saveBtn.addEventListener('click', save);
  document.querySelectorAll('#supportWhatsApp, #supportTikTok, #supportThreads, #supportWhatsAppSocial, #supportReseller').forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    });
  });

  load();
})();
