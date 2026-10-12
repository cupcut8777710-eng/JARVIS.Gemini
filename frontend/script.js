// ===== 1. SAFE KEY HANDLING =====
let API_KEY = localStorage.getItem('jarvis_key');
if(!API_KEY){
  API_KEY = prompt('Enter your Gemini API Key:');
  if(API_KEY) {
    API_KEY = API_KEY.trim();
    localStorage.setItem('jarvis_key', API_KEY);
  }
}

// ===== 2. ACTIVE GEMINI 3.x ENDPOINTS =====
const MODELS = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite"];
const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');

// ===== 3. GEMINI BRAIN =====
async function callGemini(p){
  if (!API_KEY) throw new Error("API Key missing. Clear storage & re-enter.");
  
  let lastErr;
  for(const m of MODELS){
    try{
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(API_KEY)}`;
      const res = await fetch(url, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
      });
      
      const data = await res.json();
      
      if (data.error) {
        lastErr = new Error(data.error.message || "API Error");
        continue;
      }
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch(e) { 
      lastErr = e; 
    }
  }
  throw lastErr || new Error("Connection failed to all Gemini endpoints.");
}

async function askGemini(p){
  add('J.A.R.V.I.S: Thinking...', 'ai');
  try{
    const reply = await callGemini(p);
    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  }catch(e){
    chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR - ' + e.message;
  }
}

// ===== 4. SPEECH RECOGNITION =====
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if(SR && micBtn){
  const rec = new SR();
  rec.lang = 'en-US';
  rec.onresult = (e) => {
    const t = e.results[0][0].transcript;
    add('YOU: ' + t, 'user');
    askGemini(t);
  };
  micBtn.onclick = () => {
    rec.start();
    micBtn.innerText = 'LISTENING...';
  };
  rec.onend = () => {
    micBtn.innerText = 'MIC';
  };
}

// ===== 5. TEXT-TO-SPEECH =====
let voices = [];
function loadVoices() { voices = speechSynthesis.getVoices(); }
loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(t){
  if(!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(t);
  u.rate = 1.0;
  u.pitch = 0.9;
  const v = voices.find(v => v.lang.startsWith('en'));
  if(v) u.voice = v;
  speechSynthesis.speak(u);
}

// ===== 6. SEND CONTROLS =====
const sendBtn = document.getElementById('send');
if(sendBtn) {
  sendBtn.onclick = () => {
    const t = input.value.trim();
    if(!t) return;
    add('YOU: ' + t, 'user');
    input.value = '';
    askGemini(t);
  };
}

if(input) {
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
  });
}

function add(text, who) {
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.innerText = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
        }
          
