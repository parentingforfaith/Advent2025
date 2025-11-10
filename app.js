// Advent Calendar app logic
(function(){
  const calendarEl = document.getElementById('calendar');
  const progressCountEl = document.getElementById('progressCount');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalQuestion = document.getElementById('modalQuestion');
  const closeBtn = document.getElementById('closeBtn');
  const markDoneBtn = document.getElementById('markDone');

  const STORAGE_KEY = 'advent.revealed';
  let prevUnlockedDays = [];
  let simulatedNow = null;
  let questionsData = null; // if loaded from questions.json this will be an array of objects

  // placeholder questions
  const questions = Array.from({length:24}).map((_,i)=>`Placeholder question for day ${i+1}. Share a favorite memory or story.`);

  function loadRevealed(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    }catch(e){return []}
  }
  function saveRevealed(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

  function isUnlocked(day){
    // No special-case: day 1 should follow the same unlock rules as the others
    const now = simulatedNow || new Date();
    const year = now.getFullYear();
    // months are 0-indexed; December = 11
    const unlock = new Date(year, 11, day, 6, 0, 0, 0);
    // If current date is earlier in year than December, this still works (it will be in future and locked)
    return now >= unlock;
  }

  function getUnlockedDays(){
    const arr = [];
    for(let d=1; d<=24; d++) if(isUnlocked(d)) arr.push(d);
    return arr;
  }

  function render(){
    const revealed = loadRevealed();
    calendarEl.innerHTML = '';
    const unlockedDays = getUnlockedDays();
    for(let i=1;i<=24;i++){
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.setAttribute('data-day', i);
      tile.setAttribute('aria-label', `Day ${i}`);
      tile.type = 'button';
      
      // subtle deterministic randomness per tile for variety
      // base scale within [0.98,1.02] (±2%) and rotation within [-4deg,4deg]
      const pseudoRand = (n) => {
        return Math.abs(Math.sin(n) * 43758.5453) % 1;
      };
      const r1 = pseudoRand(i * 13.7);
      const r2 = pseudoRand(i * 7.3 + 1.3);
      const scale = 0.98 + r1 * 0.04; // 0.98..1.02
      const rot = (r2 * 8) - 4; // -4 .. +4 degrees
      const hoverScale = 1.04; // up to +4% on hover
      tile.style.setProperty('--s', scale.toFixed(3));
      tile.style.setProperty('--hs', hoverScale.toFixed(3));
      tile.style.setProperty('--r', rot.toFixed(2) + 'deg');

  const unlocked = unlockedDays.includes(i);
      const isRevealed = revealed.includes(i);

      if(!unlocked) tile.classList.add('locked');
      if(isRevealed) tile.classList.add('revealed');
      // if this day just became unlocked since last render, animate it
      if(unlocked && !prevUnlockedDays.includes(i)){
        tile.classList.add('just-unlocked');
        // remove the class after animation finishes (slightly longer than animation)
        setTimeout(()=>{
          tile.classList.remove('just-unlocked');
        }, 900);
      }

      tile.innerHTML = `<span class="number">${i}</span>`;
      const ornament = document.createElement('span'); ornament.className='ornament'; tile.appendChild(ornament);

      tile.addEventListener('click',()=>{
        if(!unlocked && !isRevealed) return; // prevent opening locked days
        openModal(i, isRevealed);
      });

      calendarEl.appendChild(tile);
    }

    // update progress
    progressCountEl.textContent = loadRevealed().length;

    // store the unlocked set for next comparison
    prevUnlockedDays = unlockedDays;
  }

  let currentOpenDay = null;
  async function openModal(day, alreadyRevealed){
    currentOpenDay = day;
    modalTitle.textContent = `Day ${day}`;
    // ensure questionsData is loaded; if not, try to load now
    if(!questionsData){
      try{
        const data = await loadQuestionsFile();
        if(Array.isArray(data) && data.length>=24){
          const ordered = new Array(24);
          data.forEach(item=>{ const d = parseInt(item.day,10); if(d>=1 && d<=24) ordered[d-1]=item; });
          for(let i=0;i<24;i++) if(!ordered[i] && data[i]) ordered[i]=data[i];
          questionsData = ordered;
        }
        document.getElementById('qStatus') && (document.getElementById('qStatus').textContent = 'questions.json: loaded');
        console.log('questions.json loaded on-demand');
      }catch(err){
        console.log('questions.json load-on-demand failed:', err && err.message);
        document.getElementById('qStatus') && (document.getElementById('qStatus').textContent = 'questions.json: not loaded');
      }
    }

    // set question and image from loaded questions.json if available
    const img = document.getElementById('modalImage');
    const embedContainer = document.getElementById('modalEmbed');
    if(questionsData && questionsData[day-1]){
      modalQuestion.textContent = questionsData[day-1].question || questions[day-1] || 'Placeholder question';
      if(img) img.src = questionsData[day-1].image || '';
      if(img) img.alt = questionsData[day-1].alt || `Image for day ${day}`;
      console.log(`openModal: using questions.json for day ${day}`);
      // optional embed HTML or extra link support
      if(embedContainer){
        // support both `embedHtml` (raw HTML string) and `extraLink` (URL)
        const embedHtml = questionsData[day-1].embedHtml || questionsData[day-1].embed || '';
        const extraLink = questionsData[day-1].extraLink || questionsData[day-1].link || '';
        if(embedHtml){
          // user-supplied HTML embed (e.g. iframe) — inserted as-is
          embedContainer.innerHTML = embedHtml;
          embedContainer.style.display = 'block';
          embedContainer.setAttribute('aria-hidden','false');
        } else if(extraLink){
          // show a simple link to extra content
          const safeHref = extraLink;
          embedContainer.innerHTML = `<p class=\"extra-link\"><a href=\"${safeHref}\" target=\"_blank\" rel=\"noopener noreferrer\">Additional content</a></p>`;
          embedContainer.style.display = 'block';
          embedContainer.setAttribute('aria-hidden','false');
        } else {
          embedContainer.innerHTML = '';
          embedContainer.style.display = 'none';
          embedContainer.setAttribute('aria-hidden','true');
        }
      }
    } else {
      modalQuestion.textContent = questions[day-1] || 'Placeholder question';
      if(img) img.src = '';
      if(img) img.alt = '';
      console.log(`openModal: using placeholder for day ${day}`);
      if(embedContainer){ embedContainer.innerHTML = ''; embedContainer.style.display='none'; embedContainer.setAttribute('aria-hidden','true'); }
    }
    modal.setAttribute('aria-hidden','false');
    // remove any closing state
    modal.classList.remove('closing');
    const mc = modal.querySelector('.modal-content');
    if(mc) mc.classList.remove('closing');
    // trigger open animation
    modal.classList.add('open');
    if(mc) mc.classList.add('open');
    // if already revealed, button says Close, else mark as done
    markDoneBtn.textContent = alreadyRevealed? 'Close' : 'Mark as done';
  }

  function closeModal(){
    // play closing animations, then hide
    const mc = modal.querySelector('.modal-content');
    // if not open, just ensure hidden
    if(!modal.classList.contains('open')){
      modal.setAttribute('aria-hidden','true');
      modal.classList.remove('closing');
      if(mc) mc.classList.remove('closing');
      currentOpenDay = null;
      return;
    }
    modal.classList.remove('open');
    if(mc) mc.classList.remove('open');
    modal.classList.add('closing');
    if(mc) mc.classList.add('closing');

    const onAnimEnd = (e) => {
      // ensure we react to modal-content animation end to finalize state
      if(e.target === mc){
        modal.setAttribute('aria-hidden','true');
        modal.classList.remove('closing');
        if(mc) mc.classList.remove('closing');
        mc.removeEventListener('animationend', onAnimEnd);
        currentOpenDay = null;
      }
    };
    if(mc) mc.addEventListener('animationend', onAnimEnd);
  }

  closeBtn.addEventListener('click',closeModal);
  modal.addEventListener('click',(e)=>{ if(e.target===modal) closeModal(); });

  markDoneBtn.addEventListener('click',()=>{
    if(!currentOpenDay) return closeModal();
    const revealed = loadRevealed();
    if(!revealed.includes(currentOpenDay)){
      revealed.push(currentOpenDay);
      // keep days sorted
      revealed.sort((a,b)=>a-b);
      saveRevealed(revealed);
    }
    render();
    closeModal();
  });

  // keyboard escape
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeModal(); });

  // initial render
  // initialize prevUnlockedDays to avoid animating all unlocked tiles on first load
  prevUnlockedDays = getUnlockedDays();

  // load optional questions.json (template) if present
  function loadQuestionsFile(){
    // Try fetch first, then fall back to XHR for local file:// cases
    return fetch('./questions.json').then(r=>{
      if(!r.ok) throw new Error('no questions.json');
      return r.json();
    }).catch(()=>{
      return new Promise((resolve,reject)=>{
        try{
          const xhr = new XMLHttpRequest();
          xhr.open('GET','./questions.json',true);
          xhr.overrideMimeType && xhr.overrideMimeType('application/json');
          xhr.onload = function(){
            if(xhr.status === 200 || (xhr.status===0 && xhr.responseText)){
              try{ const data = JSON.parse(xhr.responseText); resolve(data); }catch(e){ reject(e); }
            } else { reject(new Error('xhr failed')); }
          };
          xhr.onerror = ()=>reject(new Error('xhr error'));
          xhr.send();
        }catch(e){ reject(e); }
      });
    });
  }

  loadQuestionsFile().then(data=>{
    if(Array.isArray(data) && data.length>=24){
      // normalize into array ordered by day (1..24)
      const ordered = new Array(24);
      data.forEach(item=>{
        const d = parseInt(item.day,10);
        if(d>=1 && d<=24) ordered[d-1] = item;
      });
      // fill any missing with defaults from the fetched array order
      for(let i=0;i<24;i++) if(!ordered[i] && data[i]) ordered[i]=data[i];
      questionsData = ordered;
      // populate fallback questions array as plain text as well
      for(let i=0;i<24;i++){
        if(questionsData[i] && questionsData[i].question) questions[i] = questionsData[i].question;
      }
      const qStatusElInit = document.getElementById('qStatus');
      if(qStatusElInit) qStatusElInit.textContent = 'questions.json: loaded';
    }
  }).catch((err)=>{
    // no questions.json or parse error — that's fine, we'll use built-in placeholders
    console.log('questions.json not loaded:', err && err.message);
    const qStatusElInit = document.getElementById('qStatus');
    if(qStatusElInit) qStatusElInit.textContent = 'questions.json: not loaded';
  }).finally(()=>{
    render();
  });

  // Developer simulation toolbar wiring
  function formatDateTimeLocal(d){
    // returns e.g. 2025-11-03T09:30
    const pad = (n)=>String(n).padStart(2,'0');
    const y = d.getFullYear();
    const m = pad(d.getMonth()+1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}-${m}-${day}T${hh}:${mm}`;
  }

  const useSim = document.getElementById('useSim');
  const simNowInput = document.getElementById('simNow');
  const resetSimBtn = document.getElementById('resetSim');
  if(simNowInput){ simNowInput.value = formatDateTimeLocal(new Date()); }
  if(useSim){
    useSim.addEventListener('change', ()=>{
      if(useSim.checked){
        // enable simulated now from input
        const v = simNowInput.value;
        simulatedNow = v ? new Date(v) : new Date();
      } else {
        simulatedNow = null;
      }
      render();
    });
  }
  if(simNowInput){
    simNowInput.addEventListener('change', ()=>{
      if(useSim && useSim.checked){
        const v = simNowInput.value; simulatedNow = v ? new Date(v) : new Date();
        render();
      }
    });
  }
  if(resetSimBtn){
    resetSimBtn.addEventListener('click', ()=>{
      simulatedNow = null; if(useSim) useSim.checked = false; if(simNowInput) simNowInput.value = formatDateTimeLocal(new Date()); render();
    });
  }

  const reloadQuestionsBtn = document.getElementById('reloadQuestions');
  const qStatusEl = document.getElementById('qStatus');
  if(reloadQuestionsBtn){
    reloadQuestionsBtn.addEventListener('click', ()=>{
      // reset and reload
      questionsData = null;
      qStatusEl && (qStatusEl.textContent = 'questions.json: reloading...');
      loadQuestionsFile().then(data=>{
        if(Array.isArray(data) && data.length>=24){
          const ordered = new Array(24);
          data.forEach(item=>{ const d = parseInt(item.day,10); if(d>=1 && d<=24) ordered[d-1]=item; });
          for(let i=0;i<24;i++) if(!ordered[i] && data[i]) ordered[i]=data[i];
          questionsData = ordered;
          for(let i=0;i<24;i++) if(questionsData[i] && questionsData[i].question) questions[i] = questionsData[i].question;
          qStatusEl && (qStatusEl.textContent = 'questions.json: loaded');
        } else {
          qStatusEl && (qStatusEl.textContent = 'questions.json: invalid');
        }
      }).catch(err=>{ qStatusEl && (qStatusEl.textContent = 'questions.json: not loaded'); console.log('reload questions error', err); })
      .finally(()=>render());
    });
  }

  // also refresh render at 6am boundaries in case unlocking changes while app open
  // check every minute
  setInterval(render, 60*1000);

})();
