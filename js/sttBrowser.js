
// Minimaler SpeechRecognition-Wrapper (nur Chrome/Blink)
let recognition = null;

export function start(lang='ru-RU', onResult){
  if(!window.webkitSpeechRecognition)
    throw new Error('STT unsupported');
  recognition = new webkitSpeechRecognition();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.onresult = e => {
    const txt = Array.from(e.results)
      .map(r => r[0].transcript).join(' ');
    onResult(txt);
  };
  recognition.start();
  return stop;
}

export function stop(){
  if(recognition){
    recognition.stop();
    recognition = null;
  }
}
