const DATA_URL = "data/flashcards.json";
let allCards = [], cards = [], index = 0, revealed = false;
let status = JSON.parse(localStorage.getItem("afcscFlashcardStatus") || "{}");
let playing = false, paused = false, audioEnabled = true, playQueue = [], timer = null, timerDue = 0, timerRemaining = 0, playbackStage = "";
const $ = id => document.getElementById(id);
const save = () => localStorage.setItem("afcscFlashcardStatus", JSON.stringify(status));
const modules = () => [...new Map(allCards.map(c => [c.module_number,c.module])).entries()].sort((a,b)=>a[0]-b[0]);
let availableVoices = [];
function populateModules(){
  const select=$("moduleSelect");
  modules().forEach(([num,name])=>{const o=document.createElement("option");o.value=String(num);o.textContent=name;select.appendChild(o);});
}
function filtered(){
  stopPlayback(false);
  const m=$("moduleSelect").value;
  cards=allCards.filter(c=>m==="all" || String(c.module_number)===m);
  index=0;revealed=false;render();
}
function counts(){
  const known=Object.values(status).filter(x=>x==="known").length;
  const review=Object.values(status).filter(x=>x==="review").length;
  $("knownTotal").textContent=known;$("reviewTotal").textContent=review;
  $("remainingTotal").textContent=Math.max(0,allCards.length-known-review);
  $("progressCounts").textContent=`Known ${known} · Review ${review}`;
}
function render(){
  if(!cards.length)return;
  const c=cards[index],state=status[c.id];
  $("position").textContent=`Card ${index+1} of ${cards.length}`;
  $("progressBar").style.width=`${((index+1)/cards.length)*100}%`;
  $("moduleTag").textContent=`MODULE ${c.module_number}`;$("cardId").textContent=c.id;
  $("sideLabel").textContent=revealed?"ANSWER":"QUESTION";
  $("cardText").textContent=revealed?c.back:c.front;
  $("tapHint").textContent=revealed?"Tap to show question":"Tap card or Reveal answer";
  $("flashcard").classList.toggle("answer",revealed);
  $("flashcard").setAttribute("aria-label",revealed?"Answer. Activate to show question.":"Question. Activate to reveal answer.");
  $("revealBtn").textContent=revealed?"Show question":"Reveal answer";
  $("ratingRow").hidden=!revealed;
  $("knownBtn").textContent=state==="known"?"✓ Marked known":"✓ I knew it";
  $("missedBtn").textContent=state==="review"?"× Marked for review":"× Need to review";
  $("prevBtn").disabled=index===0;
  $("nextBtn").textContent=index===cards.length-1?"Finish module":"Next →";
  counts();
}
function flip(){if(playing)return;revealed=!revealed;render();}
function move(delta){
  if(playing)stopPlayback(false);
  index=Math.max(0,Math.min(cards.length-1,index+delta));revealed=false;render();
}
function mark(value){const c=cards[index];status[c.id]=value;save();render();if(index<cards.length-1)move(1);}
function shuffle(){stopPlayback(false);for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}index=0;revealed=false;render();}
function loadVoices(){
  if(!('speechSynthesis' in window)){$("audioStatus").textContent="Audio unavailable";$("audioToggleBtn").disabled=true;return;}
  availableVoices=window.speechSynthesis.getVoices();
  const select=$("voiceSelect"),previous=select.value;
  select.innerHTML='<option value="">Default English voice</option>';
  const english=availableVoices.filter(v=>/^en(-|_)/i.test(v.lang));
  english.forEach((v,i)=>{const o=document.createElement('option');o.value=String(availableVoices.indexOf(v));o.textContent=`${v.name} (${v.lang})`;select.appendChild(o);});
  const googleIndex=english.find(v=>/google/i.test(v.name));
  if(previous)select.value=previous;else if(googleIndex)select.value=String(availableVoices.indexOf(googleIndex));
  $("audioStatus").textContent=english.length?"Audio ready":"Using device voice";
}
function speak(text,onDone){
  if(!audioEnabled||!('speechSynthesis' in window)){onDone();return;}
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  const voiceIndex=$("voiceSelect").value;
  if(voiceIndex!==""&&availableVoices[Number(voiceIndex)])utterance.voice=availableVoices[Number(voiceIndex)];
  else {const english=availableVoices.find(v=>/^en(-|_)/i.test(v.lang));if(english)utterance.voice=english;}
  utterance.rate=Number($("speedSelect").value)||1;utterance.pitch=1;
  utterance.onend=()=>{if(playing&&!paused)onDone();};
  utterance.onerror=()=>{if(playing&&!paused)onDone();};
  window.speechSynthesis.speak(utterance);
}
function setPlaybackControls(){
  $("pauseBtn").disabled=!playing;$("stopBtn").disabled=!playing;
  $("pauseBtn").textContent=paused?"▶ Resume":"Ⅱ Pause";
  $("playAllBtn").disabled=playing;$("playModuleBtn").disabled=playing;
}
function schedule(fn,ms){clearTimeout(timer);timerRemaining=ms;timerDue=Date.now()+ms;timer=setTimeout(()=>{timer=null;timerRemaining=0;if(playing&&!paused)fn();},ms);}
function playCurrent(){
  if(!playing||paused)return;
  if(index>=playQueue.length){finishPlayback();return;}
  const c=playQueue[index];
  revealed=false;render();playbackStage="question";
  $("playbackNote").textContent=`Playing question ${index+1} of ${playQueue.length}`;
  speak(c.front,()=>{
    if(!playing||paused)return;
    schedule(()=>{
      revealed=true;render();playbackStage="answer";
      $("playbackNote").textContent=`Answer ${index+1} of ${playQueue.length}`;
      speak(c.back,()=>schedule(nextPlaybackCard,1200));
    },audioEnabled?450:2600);
  });
  if(!audioEnabled)schedule(()=>{
    if(!playing||paused)return;
    revealed=true;render();playbackStage="answer";
    $("playbackNote").textContent=`Answer ${index+1} of ${playQueue.length}`;
    schedule(nextPlaybackCard,3500);
  },3000);
}
function nextPlaybackCard(){
  if(!playing||paused)return;
  if(index<playQueue.length-1){index++;revealed=false;playCurrent();}
  else finishPlayback();
}
function startPlayback(mode){
  if(!allCards.length)return;
  if(!('speechSynthesis' in window)&&audioEnabled){audioEnabled=false;$("audioToggleBtn").textContent="🔇 Audio off";}
  playQueue=mode==="all"?[...allCards]:[...cards];
  if(mode==="all"){
    cards=[...allCards];$("moduleSelect").value="all";
  }
  const currentId=cards[index]?.id;
  const startAt=playQueue.findIndex(c=>c.id===currentId);
  if(startAt>0){playQueue=[...playQueue.slice(startAt),...playQueue.slice(0,startAt)];}
  cards=[...playQueue];
  index=0;playing=true;paused=false;playbackStage="";revealed=false;
  setPlaybackControls();playCurrent();
}
function pausePlayback(){
  if(!playing)return;
  if(!paused){paused=true;clearTimeout(timer);if(timer){timerRemaining=Math.max(0,timerDue-Date.now());timer=null;}if('speechSynthesis'in window)window.speechSynthesis.pause();$("playbackNote").textContent="Playback paused.";}
  else {paused=false;if('speechSynthesis'in window)window.speechSynthesis.resume();setPlaybackControls();if(timerRemaining>0){const remaining=timerRemaining;const stage=playbackStage;schedule(()=>{
      if(stage==="question"){revealed=true;render();playbackStage="answer";$("playbackNote").textContent=`Answer ${index+1} of ${playQueue.length}`;speak(playQueue[index].back,()=>schedule(nextPlaybackCard,1200));}
      else nextPlaybackCard();
    },remaining);
  }else if(!window.speechSynthesis||window.speechSynthesis.paused===false){playCurrent();}}
  setPlaybackControls();
}
function stopPlayback(updateNote=true){
  playing=false;paused=false;clearTimeout(timer);timer=null;timerRemaining=0;
  if('speechSynthesis'in window)window.speechSynthesis.cancel();
  setPlaybackControls();if(updateNote)$("playbackNote").textContent="Playback stopped. You can continue manually.";
}
function finishPlayback(){stopPlayback(false);revealed=true;render();$("playbackNote").textContent="Playback complete. You have reached the end of the selected cards.";}
async function init(){
  try{const response=await fetch(DATA_URL);const data=await response.json();allCards=data.cards;cards=[...allCards];populateModules();render();loadVoices();
    if('speechSynthesis'in window)window.speechSynthesis.onvoiceschanged=loadVoices;
    if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }catch(e){$("cardText").textContent="Unable to load flashcards. Please refresh the app.";}
}
$("flashcard").addEventListener("click",flip);
$("flashcard").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();flip();}});
$("revealBtn").addEventListener("click",flip);
$("prevBtn").addEventListener("click",()=>move(-1));$("nextBtn").addEventListener("click",()=>move(1));
$("knownBtn").addEventListener("click",()=>mark("known"));$("missedBtn").addEventListener("click",()=>mark("review"));
$("moduleSelect").addEventListener("change",filtered);$("shuffleBtn").addEventListener("click",shuffle);
$("resetBtn").addEventListener("click",()=>{if(confirm("Clear all saved card ratings on this device?")){status={};save();render();}});
$("playAllBtn").addEventListener("click",()=>startPlayback("all"));
$("playModuleBtn").addEventListener("click",()=>startPlayback("module"));
$("pauseBtn").addEventListener("click",pausePlayback);$("stopBtn").addEventListener("click",()=>stopPlayback());
$("audioToggleBtn").addEventListener("click",()=>{
  audioEnabled=!audioEnabled;$("audioToggleBtn").textContent=audioEnabled?"🔊 Audio on":"🔇 Audio off";
  $("audioToggleBtn").setAttribute("aria-pressed",String(audioEnabled));
  if(playing&&!paused){
    $("playbackNote").textContent=audioEnabled?"Audio enabled for the next spoken item.":"Audio muted; cards will continue automatically.";
    if(!audioEnabled&&'speechSynthesis'in window){
      window.speechSynthesis.cancel();
      if(playbackStage==="question")schedule(()=>{revealed=true;render();playbackStage="answer";$("playbackNote").textContent=`Answer ${index+1} of ${playQueue.length}`;schedule(nextPlaybackCard,3500);},300);
      else if(playbackStage==="answer")schedule(nextPlaybackCard,300);
    }
  }
});
init();
