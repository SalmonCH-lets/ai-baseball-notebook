/**
 * Web Speech API Voice Input Module
 * ハンズフリー音声入力＆リアルタイムテキスト挿入モジュール
 */

const VoiceInput = (function () {

  let recognition = null;
  let isListening = false;
  let onResultCallback = null;
  let onStatusChangeCallback = null;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function init() {
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript && onResultCallback) {
          onResultCallback(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Voice recognition error:", event.error);
        stop();
      };

      recognition.onend = () => {
        if (isListening) {
          try { recognition.start(); } catch (e) {}
        } else {
          if (onStatusChangeCallback) onStatusChangeCallback(false);
        }
      };
    }
  }

  function start(onResult, onStatusChange) {
    onResultCallback = onResult;
    onStatusChangeCallback = onStatusChange;

    if (!SpeechRecognition) {
      alert("⚠️ お使いのブラウザはマイク音声認識に対応していません。代わりにサンプル音声テキストを入力します。");
      const demoVoiceText = "今日は練習試合だった。センターで浅いフライの一歩目が遅れてヒットにしてしまった。次は打球音と同時に素早く前傾でスタートを切りたい。";
      if (onResultCallback) onResultCallback(demoVoiceText);
      return;
    }

    if (!recognition) init();

    try {
      recognition.start();
      isListening = true;
      if (onStatusChangeCallback) onStatusChangeCallback(true);
    } catch (e) {
      console.error("Mic start failed:", e);
    }
  }

  function stop() {
    isListening = false;
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
    if (onStatusChangeCallback) onStatusChangeCallback(false);
  }

  function toggle(onResult, onStatusChange) {
    if (isListening) {
      stop();
    } else {
      start(onResult, onStatusChange);
    }
  }

  return {
    init,
    start,
    stop,
    toggle,
    isSupported: () => !!SpeechRecognition
  };

})();

window.VoiceInput = VoiceInput;
