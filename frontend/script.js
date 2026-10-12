// ===== 1. SAFE KEY HANDLING =====
let API_KEY = localStorage.getItem('jarvis_key');
if(!API_KEY){
  API_KEY = prompt('Enter your Gemini API Key:');
  if(API_KEY) {
    API_KEY = API_KEY.trim();
    localStorage.setItem('jarvis_key', API_KEY);
  }
}

// ===== 2. MODEL ENDPOINTS & MEMORY STORE =====
const MODELS = ["gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"];
let conversationHistory = []; // Session Chat Memory Store
let currentImageData = null; // Staged Base64 Image

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');
const camBtn = document.getElementById('cam-btn');
const camInput = document.getElementById('cam-input');

// ===== 3. GEMINI BRAIN (Multimodal + Chat Memory) =====
async function callGemini(userText, imageBase64 = null){
  if (!API_KEY) throw new Error("API Key missing. Clear site storage & re-enter.");

  // Build current user message parts
  const userParts = [{ text: userText }];
  if (imageBase64) {
    userParts.unshift({
      inline_data: {
        mime_type: "image/jpeg",
        data: imageBase64
      }
    });
  }

  // Append user message to history
  conversationHistory.push({ role: "user", parts: userParts });

  let lastErr;
  for(const m of MODELS){
    try{
      const cleanKey = encodeURIComponent(API_KEY.trim());
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${cleanKey}`;
      
      const res = await fetch(url, {
        method: "POST", 
        headers: { 
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY.trim()
        },
        body: JSON.stringify({ contents: conversationHistory })
      });
      
      const data = await res.json();
      
      if (data.error) {
        lastErr = new Error(data.error.message || "API Error");
        continue;
      }
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        const replyText = data.candidates[0].content.parts[0].text;
        // Save model response back to conversation memory
        conversationHistory.push({ role: "model", parts: [{ text: replyText }] });
        return replyText;
      }
    } catch(e) { 
      lastErr = e; 
    }
  }
  
  // Remove failed turn from history on error
  conversationHistory.pop();
  throw lastErr || new Error("Connection failed to Gemini endpoints.");
}

async function askGemini(p, imageBase64 = null){
  add('J.A.R.V.I.S: Processing visual and textual data...', 'ai');
  try{
    const reply = await callGemini(p, imageBase64);
    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  }catch(e){
    chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR - ' + e.message;
  }
}

// ===== 4. CAMERA & IMAGE HANDLER =====
if(camBtn && camInput){
  camBtn.onclick = () => camInput.click();
  
  camInput.onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      // Strip header prefix to isolate raw base64 string
      currentImageData = event.target.result.split(',')[1];
      add('SYSTEM: Image attached. Send your message or tap MIC.', 'ai');
    };
    reader.readAsDataURL(file);
  };
}

// ===== 5. SPEECH RECOGNITION =====
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if(SR && micBtn){
  const rec = new SR();
  rec.lang = 'en-US';
  rec.onresult = (e) => {
    const t = e.results[0][0].transcript;
    add('YOU: ' + t, 'user');
    const img = currentImageData;
    currentImageData = null; // Reset image buffer
    askGemini(t, img);
  };
  micBtn.onclick = () => { rec.start(); micBtn.innerText = 'LISTENING...'; };
  rec.onend = () => { micBtn.innerText = 'MIC'; };
}

// ===== 6. TEXT-TO-SPEECH =====
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

// ===== 7. SEND CONTROLS =====
const sendBtn = document.getElementById('send');
if(sendBtn) {
  sendBtn.onclick = () => {
    const t = input.value.trim() || (currentImageData ? "Analyze this image." : "");
    if(!t) return;
    add('YOU: ' + t, 'user');
    input.value = '';
    const img = currentImageData;
    currentImageData = null; // Reset image buffer
    askGemini(t, img);
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
          
