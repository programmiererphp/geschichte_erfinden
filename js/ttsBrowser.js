
// Wrapper um SpeechSynthesis (lokales Browser-TTS)
let utter = null;

export function speak(text, lang = 'ru-RU'){
  return new Promise((resolve, reject) => {
    if(!('speechSynthesis' in window)){
      return reject('TTS unsupported');
    }
    stop();                       // vorige Wiedergabe abbrechen
    utter = new SpeechSynthesisUtterance(text);
    utter.lang   = lang;
    utter.onend  = () => resolve();
    utter.onerror= e  => reject(e);
    window.speechSynthesis.speak(utter);
  });
}

export function stop(){
  if(window.speechSynthesis && window.speechSynthesis.speaking){
    window.speechSynthesis.cancel();
  }
}
