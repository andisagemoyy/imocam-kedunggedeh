'use strict';
(() => {
  const installButton = document.getElementById('installApp');
  const updateButton = document.getElementById('updateApp');
  const status = document.getElementById('pwaStatus');
  const help = document.getElementById('installHelp');
  const instructions = document.getElementById('installInstructions');
  const standalone = window.matchMedia('(display-mode: standalone)');
  const onIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installPrompt = null;
  let registration = null;
  let offlineReady = false;
  let updating = false;
  let failure = '';

  function isInstalled() {
    return standalone.matches || navigator.standalone === true;
  }

  function installationState() {
    installButton.hidden = isInstalled();
    if (isInstalled()) help.hidden = true;
  }

  function showStatus() {
    status.dataset.state = '';
    if (location.protocol === 'file:') {
      status.textContent = 'Buka tautan HTTPS untuk memasang aplikasi.';
    } else if (!window.isSecureContext) {
      status.textContent = 'Gunakan HTTPS agar aplikasi bisa dipasang.';
    } else if (offlineReady) {
      status.dataset.state = navigator.onLine ? 'ready' : 'offline';
      status.textContent = navigator.onLine ? 'Siap digunakan offline' : 'Offline · aplikasi tetap siap';
    } else if (failure) {
      status.textContent = failure;
    } else {
      status.textContent = navigator.onLine ? 'Menyiapkan penggunaan offline…' : 'Hubungkan internet untuk persiapan pertama.';
    }
  }

  function showHelp() {
    if (location.protocol === 'file:') {
      instructions.textContent = 'File lokal bisa dipakai untuk melihat tampilan. Untuk memasang IMOCAM KDH di HP, unggah isi paket ke hosting HTTPS, lalu buka tautan websitenya. Langkahnya ada di PANDUAN.txt.';
    } else if (onIOS) {
      instructions.textContent = 'Buka tautan ini lewat Safari. Ketuk Bagikan, pilih Tambahkan ke Layar Utama, lalu ketuk Tambah. Jika tersedia, aktifkan Buka sebagai app web.';
    } else {
      instructions.textContent = 'Android: buka tautan ini lewat Chrome. Ketuk menu ⋮, lalu pilih Instal aplikasi atau Tambahkan ke layar utama. Di komputer, gunakan tombol instal di bilah alamat atau menu browser. Jika pilihan belum muncul, muat ulang setelah aplikasi selesai disiapkan.';
    }
    help.hidden = false;
    help.open = true;
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installationState();
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButton.hidden = true;
    help.hidden = true;
  });

  installButton.addEventListener('click', async () => {
    if (!installPrompt) {
      showHelp();
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    installButton.disabled = true;
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === 'accepted') {
        installButton.hidden = true;
        help.hidden = true;
      }
    } catch {
      showHelp();
    } finally {
      installButton.disabled = false;
    }
  });

  function checkUpdate() {
    updateButton.hidden = !registration?.waiting;
  }

  function watchInstall() {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      checkUpdate();
      if (worker.state === 'redundant' && !offlineReady) {
        failure = 'Persiapan offline belum berhasil. Hubungkan internet lalu muat ulang.';
        showStatus();
      }
    });
  }

  updateButton.addEventListener('click', () => {
    if (!registration?.waiting || updating) return;
    updating = true;
    updateButton.disabled = true;
    updateButton.textContent = 'Memperbarui…';
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  });

  window.addEventListener('online', showStatus);
  window.addEventListener('offline', showStatus);
  if (standalone.addEventListener) standalone.addEventListener('change', installationState);
  else if (standalone.addListener) standalone.addListener(installationState);
  installationState();
  showStatus();

  if (!('serviceWorker' in navigator) || !window.isSecureContext || !/^https?:$/.test(location.protocol)) {
    if (!('serviceWorker' in navigator)) {
      failure = 'Browser ini belum mendukung penggunaan offline.';
      showStatus();
    }
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Apply a new version only after the user presses the update button.
    // This prevents a reload from discarding a photo that is being edited.
    if (updating) window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      registration = await navigator.serviceWorker.register('./sw.js', {
        scope: './', updateViaCache: 'none'
      });
      checkUpdate();
      registration.addEventListener('updatefound', watchInstall);
      watchInstall();
      await navigator.serviceWorker.ready;
      offlineReady = true;
      showStatus();
      checkUpdate();
    } catch {
      failure = 'Persiapan offline belum berhasil. Hubungkan internet lalu muat ulang.';
      showStatus();
    }
  });
})();
