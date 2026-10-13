(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let recorder = null;
  let screen = null;
  let micStream = null;
  let chunks = [];
  let saveURL = '';
  let startedAt = 0;
  let ticker = null;
  let autoStop = null;
  let stopping = false;

  function update(message, isError = false) {
    $('message').textContent = message;
    $('message').classList.toggle('error', isError);
  }
  function timeLabel(elapsed) {
    const s = Math.floor(elapsed / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function tick() { $('timer').textContent = timeLabel(Date.now() - startedAt); }
  function release() {
    if (ticker) clearInterval(ticker);
    if (autoStop) clearTimeout(autoStop);
    ticker = null; autoStop = null;
    if (screen) screen.getTracks().forEach(track => track.stop());
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    screen = null;
    micStream = null;
  }
  function resetButtons() {
    $('start').hidden = false;
    $('start').disabled = false;
    $('stop').hidden = true;
    $('stop').disabled = false;
    $('mic-label').hidden = false;
    $('dot').classList.remove('live');
    document.title = 'PMG Gravador — Gravar minha tela';
  }
  function saveRecording() {
    const type = recorder && recorder.mimeType ? recorder.mimeType : 'video/webm';
    release();
    resetButtons();
    $('state').textContent = 'Gravação finalizada';
    if (!chunks.length) {
      update('Não foi possível preparar o vídeo. Faça uma nova gravação.', true);
      return;
    }
    const fileBlob = new Blob(chunks, {type});
    chunks = [];
    if (!fileBlob.size) {
      update('A gravação veio vazia. Tente novamente.', true);
      return;
    }
    if (saveURL) URL.revokeObjectURL(saveURL);
    saveURL = URL.createObjectURL(fileBlob);
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '-' + pad(now.getHours()) + pad(now.getMinutes());
    const extension = type.startsWith('video/mp4') ? 'mp4' : 'webm';
    const download = $('download');
    download.href = saveURL;
    download.download = 'PMG-gravacao-' + stamp + '.' + extension;
    $('result').hidden = false;
    $('instruction').textContent = 'Seu vídeo já está pronto para enviar.';
    update('Pronto! Procure o arquivo na pasta Downloads.');
    download.click();
  }
  function stop() {
    if (stopping || !recorder) return;
    stopping = true;
    $('stop').disabled = true;
    $('state').textContent = 'Preparando vídeo…';
    update('Aguarde um instante enquanto o vídeo é salvo.');
    if (recorder.state !== 'inactive') recorder.stop();
    else saveRecording();
  }
  async function start() {
    if (recorder && recorder.state === 'recording') return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      update('Use o Google Chrome ou Microsoft Edge atualizado para gravar a tela.', true);
      return;
    }
    $('start').disabled = true;
    $('result').hidden = true;
    update('');
    stopping = false;
    chunks = [];
    if (saveURL) { URL.revokeObjectURL(saveURL); saveURL = ''; }
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({
        video: {frameRate: 12},
        audio: false
      });
      const videoTrack = screen.getVideoTracks()[0];
      if (!videoTrack) throw new Error('Não foi possível acessar a tela.');
      let micWarning = false;
      if ($('mic').checked) {
        try { micStream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true}, video: false}); }
        catch { micWarning = true; }
      }
      const tracks = screen.getVideoTracks().concat(micStream ? micStream.getAudioTracks() : []);
      const stream = new MediaStream(tracks);
      const candidates = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      const mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t));
      const options = {videoBitsPerSecond: 2800000};
      if (mimeType) options.mimeType = mimeType;
      recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = event => {
        if (event.data && event.data.size) chunks.push(event.data);
      };
      recorder.onstop = saveRecording;
      recorder.onerror = () => update('O gravador encontrou um problema. Pare a gravação e tente novamente.', true);
      videoTrack.addEventListener('ended', stop, {once: true});
      recorder.start(1000);
      startedAt = Date.now();
      tick();
      ticker = setInterval(tick, 1000);
      autoStop = setTimeout(stop, 10 * 60 * 1000);
      $('start').hidden = true;
      $('stop').hidden = false;
      $('stop').disabled = false;
      $('mic-label').hidden = true;
      $('state').textContent = 'Gravando a tela';
      $('dot').classList.add('live');
      document.title = '● GRAVANDO — PMG Gravador';
      $('instruction').textContent = 'Agora pode abrir a PMG e trabalhar normalmente. Quando terminar, volte aqui e clique em Parar e salvar. O vídeo para automaticamente após 10 minutos.';
      if (micWarning) update('O microfone não foi liberado, mas a tela está sendo gravada sem voz.');
      else update('Gravação em andamento. Pode mudar para a janela da PMG.');
    } catch (error) {
      release();
      resetButtons();
      $('state').textContent = 'Pronta para gravar';
      update(error && error.name === 'NotAllowedError'
        ? 'A gravação não começou. Clique em Iniciar e escolha Tela inteira → Compartilhar.'
        : 'Não consegui começar a gravação. Tente usar o Chrome ou Edge atualizado.', true);
    }
  }

  $('start').addEventListener('click', start);
  $('stop').addEventListener('click', stop);
  $('record-again').addEventListener('click', () => {
    $('result').hidden = true;
    $('instruction').innerHTML = 'Clique no botão verde. Na janela que aparecer, escolha <strong>Tela inteira</strong> e depois <strong>Compartilhar</strong>.';
    $('state').textContent = 'Pronta para gravar';
    $('timer').textContent = '00:00';
    update('');
    window.scrollTo({top: 0, behavior: 'smooth'});
  });
  window.addEventListener('beforeunload', event => {
    if (recorder && recorder.state === 'recording') {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia || typeof MediaRecorder === 'undefined') {
    $('start').disabled = true;
    update('Este navegador não consegue gravar a tela. Abra pelo Google Chrome ou Microsoft Edge atualizado.', true);
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/gravador/sw.js', {scope: '/gravador/'}).catch(() => {});
})();
