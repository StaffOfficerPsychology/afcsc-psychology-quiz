const DATA_URL = "data/flashcards.json";
let allCards = [], cards = [], index = 0, revealed = false;
let status = JSON.parse(localStorage.getItem("afcscFlashcardStatus") || "{}");
const $ = id => document.getElementById(id);
const save = () => localStorage.setItem("afcscFlashcardStatus", JSON.stringify(status));
const modules = () => [...new Map(allCards.map(c => [c.module_number,c.module])).entries()].sort((a,b)=>a[0]-b[0]);
function populateModules(){
  const select=$("moduleSelect");
  modules().forEach(([num,name])=>{
    const o=document.createElement("option"); o.value=String(num); o.textContent=name; select.appendChild(o);
  });
}
function filtered(){
  const m=$("moduleSelect").value;
  cards=allCards.filter(c=>m==="all" || String(c.module_number)===m);
  index=0; revealed=false; render();
}
function counts(){
  const known=Object.values(status).filter(x=>x==="known").length;
  const review=Object.values(status).filter(x=>x==="review").length;
  $("knownTotal").textContent=known;
  $("reviewTotal").textContent=review;
  $("remainingTotal").textContent=Math.max(0,allCards.length-known-review);
  $("progressCounts").textContent=`Known ${known} · Review ${review}`;
}
function render(){
  if(!cards.length) return;
  const c=cards[index], state=status[c.id];
  $("position").textContent=`Card ${index+1} of ${cards.length}`;
  $("progressBar").style.width=`${((index+1)/cards.length)*100}%`;
  $("moduleTag").textContent=`MODULE ${c.module_number}`;
  $("cardId").textContent=c.id;
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
function flip(){revealed=!revealed;render()}
function move(delta){
  index=Math.max(0,Math.min(cards.length-1,index+delta));
  revealed=false;render();
}
function mark(value){
  const c=cards[index]; status[c.id]=value; save(); render();
  if(index<cards.length-1) move(1);
}
function shuffle(){
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}
  index=0;revealed=false;render();
}
async function init(){
  try{
    const response=await fetch(DATA_URL);
    const data=await response.json();
    allCards=data.cards; cards=[...allCards];
    populateModules(); render();
    if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }catch(e){
    $("cardText").textContent="Unable to load flashcards. Please refresh the app.";
  }
}
$("flashcard").addEventListener("click",flip);
$("flashcard").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();flip()}});
$("revealBtn").addEventListener("click",flip);
$("prevBtn").addEventListener("click",()=>move(-1));
$("nextBtn").addEventListener("click",()=>move(1));
$("knownBtn").addEventListener("click",()=>mark("known"));
$("missedBtn").addEventListener("click",()=>mark("review"));
$("moduleSelect").addEventListener("change",filtered);
$("shuffleBtn").addEventListener("click",shuffle);
$("resetBtn").addEventListener("click",()=>{
  if(confirm("Clear all saved card ratings on this device?")){
    status={};save();render();
  }
});
init();