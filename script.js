// =========================
// Helpers
// =========================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

function logLine(el, type, text){
  const line = document.createElement("div");
  line.className = "logLine";
  const dot = document.createElement("div");
  dot.className = "dot " + (type || "");
  const msg = document.createElement("div");
  msg.textContent = text;
  line.appendChild(dot);
  line.appendChild(msg);
  el.prepend(line);
}

function setBadge(el, text, tone){
  el.textContent = text;
  el.style.borderColor = "rgba(255,255,255,.08)";
  el.style.color = "var(--muted)";
  el.style.background = "rgba(255,255,255,.04)";
  if(tone === "good"){
    el.style.borderColor = "rgba(62,242,139,.35)";
    el.style.color = "var(--text)";
    el.style.background = "rgba(62,242,139,.08)";
  }
  if(tone === "bad"){
    el.style.borderColor = "rgba(255,90,122,.40)";
    el.style.color = "var(--text)";
    el.style.background = "rgba(255,90,122,.09)";
  }
  if(tone === "warn"){
    el.style.borderColor = "rgba(255,209,102,.40)";
    el.style.color = "var(--text)";
    el.style.background = "rgba(255,209,102,.08)";
  }
}

function makeNode(value, cls="node"){
  const d = document.createElement("div");
  d.className = cls;
  d.textContent = value;
  return d;
}

function tokenizeExpr(expr){
  // Supports letters/numbers, operators + - * / ^ and parentheses.
  // Removes spaces. Multi-digit numbers become a single token.
  const s = (expr || "").replace(/\s+/g,"");
  const tokens = [];
  let num = "";
  for(let i=0;i<s.length;i++){
    const ch = s[i];
    if(/[0-9]/.test(ch)){
      num += ch;
      continue;
    }
    if(num){
      tokens.push(num);
      num = "";
    }
    if(/[A-Za-z]/.test(ch)){
      tokens.push(ch);
    }else if("+-*/^()[]{}".includes(ch)){
      tokens.push(ch);
    }
  }
  if(num) tokens.push(num);
  return tokens;
}

function isOperand(tok){
  return /^[A-Za-z]$/.test(tok) || /^[0-9]+$/.test(tok);
}
const isOperator = (t) => ["+","-","*","/","^"].includes(t);
const prec = (op) => {
  if(op === "^") return 3;
  if(op === "*" || op === "/") return 2;
  if(op === "+" || op === "-") return 1;
  return 0;
};
const isOpen = (t) => ["(","[","{"].includes(t);
const isClose = (t) => [")","]","}"].includes(t);
const matches = (open, close) =>
  (open==="(" && close===")") ||
  (open==="[" && close==="]") ||
  (open==="{" && close==="}");

// =========================
// Tabs / Views
// =========================
function activateView(viewId){
  $$(".tab").forEach(b=>b.classList.remove("active"));
  $$(".view").forEach(v=>v.classList.remove("active"));
  const btn = $(`.tab[data-view="${viewId}"]`);
  if(btn) btn.classList.add("active");
  const v = $("#"+viewId);
  if(v) v.classList.add("active");
}

$$(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=> activateView(btn.dataset.view));
});
$$("[data-jump]").forEach(btn=>{
  btn.addEventListener("click", ()=> activateView(btn.dataset.jump));
});

// =========================
// STACK
// =========================
const stack = [];
const stackViz = $("#stackViz");
const stackLog = $("#stackLog");
const stackStatus = $("#stackStatus");
const stackSize = $("#stackSize");
const stackInput = $("#stackInput");

function refreshStack(){
  stackViz.innerHTML = "";
  for(const v of stack){
    stackViz.appendChild(makeNode(v, "node"));
  }
  stackSize.textContent = String(stack.length);
  if(stack.length === 0) setBadge(stackStatus, "Empty", "warn");
  else setBadge(stackStatus, "Ready (Top = "+stack[stack.length-1]+")", "good");
}

async function stackPush(vOverride=null){
  const v = (vOverride ?? stackInput.value).trim();
  if(!v){
    logLine(stackLog, "warn", "push: enter a value first.");
    setBadge(stackStatus, "No value provided", "warn");
    return;
  }
  stack.push(v);
  logLine(stackLog, "good", `push(${v}) → top moves up.`);
  refreshStack();
  stackInput.value = "";
  await sleep(180);
}

async function stackPop(){
  if(stack.length === 0){
    logLine(stackLog, "bad", "pop() → UNDERFLOW (stack is empty).");
    setBadge(stackStatus, "Underflow", "bad");
    return null;
  }
  const last = stackViz.lastElementChild;
  if(last){
    last.classList.add("removing");
    await sleep(220);
  }
  const v = stack.pop();
  logLine(stackLog, "good", `pop() → removed ${v}.`);
  refreshStack();
  await sleep(140);
  return v;
}

function stackTop(){
  if(stack.length === 0){
    logLine(stackLog, "bad", "top() → UNDERFLOW (stack is empty).");
    setBadge(stackStatus, "Underflow", "bad");
    return null;
  }
  const v = stack[stack.length-1];
  logLine(stackLog, "good", `top() → ${v} (no removal).`);
  setBadge(stackStatus, `Top = ${v}`, "good");
  return v;
}

function clearStack(){
  stack.length = 0;
  stackLog.innerHTML = "";
  refreshStack();
  logLine(stackLog, "warn", "stack cleared.");
}

$("#btnPush").addEventListener("click", ()=> stackPush());
$("#btnPop").addEventListener("click", stackPop);
$("#btnTop").addEventListener("click", stackTop);
$("#btnClearStack").addEventListener("click", clearStack);

$("#btnStackDemo").addEventListener("click", async ()=>{
  clearStack();
  // matches your tracing example logic
  await stackPush("10");
  await sleep(250);
  await stackPush("20");
  await sleep(250);
  await stackPush("30");
  await sleep(250);
  await stackPop();
  await sleep(250);
  stackTop();
});

// Learn view buttons (animations)
$("#btnLearnStackAnim").addEventListener("click", async ()=>{
  activateView("stackView");
  $("#btnStackDemo").click();
});
$("#btnCheatStackDemo").addEventListener("click", async ()=>{
  activateView("stackView");
  $("#btnStackDemo").click();
});

refreshStack();

// =========================
// BALANCED PARENTHESES (ANIMATED)
// =========================
const parenInput = $("#parenInput");
const parenStatus = $("#parenStatus");
const dupStatus = $("#dupStatus");
const scanTape = $("#scanTape");
const parenStackViz = $("#parenStackViz");
const parenLog = $("#parenLog");

function clearParen(){
  parenInput.value = "";
  scanTape.innerHTML = "";
  parenStackViz.innerHTML = "";
  parenLog.innerHTML = "";
  setBadge(parenStatus, "Waiting…", "warn");
  setBadge(dupStatus, "Duplicate: —", "warn");
}
$("#btnClearParen").addEventListener("click", clearParen);

$("#btnParenExampleGood").addEventListener("click", ()=>{
  parenInput.value = "{(A+B)*(C+D)}";
});
$("#btnParenExampleBad").addEventListener("click", ()=>{
  parenInput.value = "[2*3] + (A)]";
});
$("#btnParenExampleDup").addEventListener("click", ()=>{
  parenInput.value = "((x+y))+z";
});

async function animateParenScan(tokens){
  scanTape.innerHTML = "";
  const chips = tokens.map(t=>{
    const c = document.createElement("div");
    c.className = "chip";
    c.textContent = t;
    scanTape.appendChild(c);
    return c;
  });
  return chips;
}

function refreshMiniStack(st){
  parenStackViz.innerHTML = "";
  for(const v of st){
    parenStackViz.appendChild(makeNode(v, "miniNode"));
  }
}

$("#btnCheckParen").addEventListener("click", async ()=>{
  const expr = parenInput.value;
  parenLog.innerHTML = "";
  parenStackViz.innerHTML = "";
  setBadge(parenStatus, "Checking…", "warn");

  const tokens = tokenizeExpr(expr).filter(t => isOpen(t) || isClose(t));
  if(tokens.length === 0){
    setBadge(parenStatus, "No brackets found (balanced)", "good");
    logLine(parenLog, "good", "No brackets to check.");
    scanTape.innerHTML = "";
    return;
  }
  const chips = await animateParenScan(tokens);

  const st = [];
  refreshMiniStack(st);

  for(let i=0;i<tokens.length;i++){
    chips.forEach(c=>c.classList.remove("active"));
    chips[i].classList.add("active");
    const t = tokens[i];

    if(isOpen(t)){
      st.push(t);
      refreshMiniStack(st);
      logLine(parenLog, "good", `Read ${t}: push opening bracket.`);
    } else {
      if(st.length === 0){
        logLine(parenLog, "bad", `Read ${t}: stack empty → NOT balanced.`);
        setBadge(parenStatus, "NOT balanced (closing without opening)", "bad");
        return;
      }
      const top = st[st.length-1];
      if(matches(top, t)){
        const last = parenStackViz.lastElementChild;
        if(last){ last.classList.add("removing"); await sleep(220); }
        st.pop();
        refreshMiniStack(st);
        logLine(parenLog, "good", `Read ${t}: matches ${top} → pop.`);
      }else{
        logLine(parenLog, "bad", `Read ${t}: top is ${top} (mismatch) → NOT balanced.`);
        setBadge(parenStatus, "NOT balanced (mismatch)", "bad");
        return;
      }
    }
    await sleep(520);
  }

  if(st.length === 0){
    setBadge(parenStatus, "Balanced ✅ (stack ended empty)", "good");
    logLine(parenLog, "good", "End: stack empty → Balanced.");
  }else{
    setBadge(parenStatus, "NOT balanced ❌ (open brackets left)", "bad");
    logLine(parenLog, "bad", "End: stack not empty → Not balanced.");
  }
});

// Duplicate parentheses checker (classic stack method)
// Idea: push chars; when we see ')', if top is '(' => duplicate
$("#btnCheckDup").addEventListener("click", async ()=>{
  const expr = (parenInput.value || "").replace(/\s+/g,"");
  setBadge(dupStatus, "Duplicate: checking…", "warn");

  const st = [];
  let found = false;

  // animate scan tape for ALL characters to match your examples
  const chars = expr.split("");
  scanTape.innerHTML = "";
  const chips = chars.map(ch=>{
    const c = document.createElement("div");
    c.className = "chip";
    c.textContent = ch;
    scanTape.appendChild(c);
    return c;
  });
  parenLog.innerHTML = "";
  parenStackViz.innerHTML = "";

  for(let i=0;i<chars.length;i++){
    chips.forEach(c=>c.classList.remove("active"));
    chips[i].classList.add("active");
    const ch = chars[i];

    if(ch === ")"){
      if(st.length === 0){
        logLine(parenLog, "bad", "Found ')', but stack empty → invalid expression for this check.");
        setBadge(dupStatus, "Duplicate: cannot decide (invalid)", "bad");
        return;
      }
      const top = st[st.length-1];
      if(top === "("){
        found = true;
        logLine(parenLog, "bad", "Found '()' with nothing inside → duplicate parentheses ✅");
        setBadge(dupStatus, "Duplicate: YES ✅", "bad");
        return;
      }
      // pop until '('
      let poppedCount = 0;
      while(st.length && st[st.length-1] !== "("){
        st.pop(); poppedCount++;
      }
      if(st.length && st[st.length-1] === "(") st.pop(); // remove '('
      logLine(parenLog, "good", `')' closes a real group (popped ${poppedCount} chars) → not duplicate here.`);
    } else {
      st.push(ch);
      logLine(parenLog, "warn", `Push '${ch}'`);
    }

    // refresh mini stack for visualization
    parenStackViz.innerHTML = "";
    for(const v of st){
      parenStackViz.appendChild(makeNode(v, "miniNode"));
    }
    await sleep(220);
  }

  setBadge(dupStatus, found ? "Duplicate: YES ✅" : "Duplicate: NO ❌", found ? "bad" : "good");
  if(!found) logLine(parenLog, "good", "No duplicate parentheses detected.");
});

// cheat sheet parentheses demo
$("#btnCheatParenDemo").addEventListener("click", async ()=>{
  activateView("stackView");
  clearParen();
  parenInput.value = "(()";
  $("#btnCheckParen").click();
});

// =========================
// INFIX → POSTFIX (ANIMATED)
// =========================
const infixInput = $("#infixInput");
const convertStatus = $("#convertStatus");
const convertTape = $("#convertTape");
const opStackViz = $("#opStackViz");
const postfixOut = $("#postfixOut");
const convertLog = $("#convertLog");

function clearConvert(){
  infixInput.value = "";
  convertTape.innerHTML = "";
  opStackViz.innerHTML = "";
  postfixOut.innerHTML = "";
  convertLog.innerHTML = "";
  setBadge(convertStatus, "Waiting…", "warn");
}
$("#btnClearConvert").addEventListener("click", clearConvert);
$("#btnConvertExample").addEventListener("click", ()=>{ infixInput.value = "2+3*1"; });

function renderTape(el, tokens){
  el.innerHTML = "";
  return tokens.map(t=>{
    const c = document.createElement("div");
    c.className = "chip";
    c.textContent = t;
    el.appendChild(c);
    return c;
  });
}
function refreshOpStack(opSt){
  opStackViz.innerHTML = "";
  for(const v of opSt){
    opStackViz.appendChild(makeNode(v, "miniNode"));
  }
}
function pushOut(t){
  const tok = document.createElement("div");
  tok.className = "outToken";
  tok.textContent = t;
  postfixOut.appendChild(tok);
}

async function infixToPostfixAnimated(expr){
  convertTape.innerHTML = "";
  opStackViz.innerHTML = "";
  postfixOut.innerHTML = "";
  convertLog.innerHTML = "";

  const tokens = tokenizeExpr(expr);
  if(tokens.length === 0){
    setBadge(convertStatus, "Please enter an expression", "warn");
    logLine(convertLog, "warn", "No tokens found.");
    return null;
  }

  setBadge(convertStatus, "Converting…", "warn");
  const chips = renderTape(convertTape, tokens);

  const opSt = [];
  const out = [];

  const popOpToOut = async () => {
    const last = opStackViz.lastElementChild;
    if(last){ last.classList.add("removing"); await sleep(220); }
    const v = opSt.pop();
    refreshOpStack(opSt);
    out.push(v);
    pushOut(v);
    logLine(convertLog, "good", `Pop ${v} → output`);
  };

  for(let i=0;i<tokens.length;i++){
    chips.forEach(c=>c.classList.remove("active"));
    chips[i].classList.add("active");
    const t = tokens[i];

    if(isOperand(t)){
      out.push(t);
      pushOut(t);
      logLine(convertLog, "good", `Operand ${t} → output`);
    } else if(isOpen(t)){
      opSt.push(t);
      refreshOpStack(opSt);
      logLine(convertLog, "warn", `Push ${t}`);
    } else if(isClose(t)){
      logLine(convertLog, "warn", `) found → pop until (`);
      while(opSt.length && !isOpen(opSt[opSt.length-1])){
        await popOpToOut();
        await sleep(120);
      }
      if(opSt.length && isOpen(opSt[opSt.length-1])){
        // discard opening
        const last = opStackViz.lastElementChild;
        if(last){ last.classList.add("removing"); await sleep(220); }
        const open = opSt.pop();
        refreshOpStack(opSt);
        logLine(convertLog, "good", `Discard ${open}`);
      } else {
        setBadge(convertStatus, "Invalid (missing opening bracket)", "bad");
        return null;
      }
    } else if(isOperator(t)){
      logLine(convertLog, "warn", `Operator ${t} → pop higher/equal precedence`);
      while(opSt.length && isOperator(opSt[opSt.length-1])){
        const top = opSt[opSt.length-1];
        const shouldPop = (t === "^")
          ? (prec(top) > prec(t)) // right-assoc
          : (prec(top) >= prec(t));
        if(!shouldPop) break;
        await popOpToOut();
        await sleep(100);
      }
      opSt.push(t);
      refreshOpStack(opSt);
      logLine(convertLog, "good", `Push operator ${t}`);
    } else {
      logLine(convertLog, "warn", `Ignored token ${t}`);
    }

    await sleep(480);
  }

  logLine(convertLog, "warn", "End → pop remaining operators");
  while(opSt.length){
    const top = opSt[opSt.length-1];
    if(isOpen(top)){
      setBadge(convertStatus, "Invalid (unclosed bracket)", "bad");
      return null;
    }
    await popOpToOut();
    await sleep(120);
  }

  const postfixStr = out.join(" ");
  setBadge(convertStatus, "Done ✅ Postfix: " + postfixStr, "good");
  return postfixStr;
}

$("#btnConvertPostfix").addEventListener("click", async ()=>{
  await infixToPostfixAnimated(infixInput.value.trim());
});

$("#btnConvertAnim").addEventListener("click", async ()=>{
  if(!infixInput.value.trim()) infixInput.value = "(2+3)*1";
  await infixToPostfixAnimated(infixInput.value.trim());
});

$("#btnLearnExprAnim").addEventListener("click", async ()=>{
  activateView("exprView");
  infixInput.value = "2+3*1";
  await infixToPostfixAnimated(infixInput.value.trim());
});

$("#btnCheatConvertDemo").addEventListener("click", async ()=>{
  activateView("exprView");
  infixInput.value = "(2+3)*1";
  await infixToPostfixAnimated(infixInput.value.trim());
});

// =========================
// INFIX → PREFIX (your method)
// =========================
const infix2Input = $("#infix2Input");
const prefixStatus = $("#prefixStatus");
const prefixSteps = $("#prefixSteps");

function clearPrefix(){
  infix2Input.value = "";
  prefixSteps.textContent = "Steps will appear here.";
  setBadge(prefixStatus, "Waiting…", "warn");
}
$("#btnClearPrefix").addEventListener("click", clearPrefix);
$("#btnPrefixExample").addEventListener("click", ()=>{ infix2Input.value = "A+B*C"; });

function reverseAndSwap(infix){
  const chars = infix.replace(/\s+/g,"").split("").reverse().map(ch=>{
    if(ch === "(") return ")";
    if(ch === ")") return "(";
    return ch;
  });
  return chars.join("");
}

function reverseTokens(tokens){
  return tokens.slice().reverse();
}

async function infixToPrefixAnimated(infix){
  const cleaned = (infix || "").replace(/\s+/g,"");
  if(!cleaned){
    setBadge(prefixStatus, "Enter an infix expression", "warn");
    prefixSteps.textContent = "Steps will appear here.";
    return null;
  }
  setBadge(prefixStatus, "Converting…", "warn");

  const step1 = reverseAndSwap(cleaned);
  // Convert step1 to postfix using same converter but without animation UI clutter:
  const postfix = infixToPostfixNoUI(step1); // space-separated
  if(postfix === null){
    setBadge(prefixStatus, "Invalid infix", "bad");
    return null;
  }
  const prefix = postfix.split(/\s+/).filter(Boolean).reverse().join(" ");

  prefixSteps.innerHTML =
    `<b>Step 1:</b> Reverse + swap brackets → <code>${escapeHtml(step1)}</code><br/>` +
    `<b>Step 2:</b> Convert to postfix → <code>${escapeHtml(postfix)}</code><br/>` +
    `<b>Step 3:</b> Reverse postfix → <code>${escapeHtml(prefix)}</code>`;

  setBadge(prefixStatus, "Done ✅ Prefix: " + prefix, "good");
  return prefix;
}

// Non-UI postfix converter (for prefix method)
function infixToPostfixNoUI(expr){
  const tokens = tokenizeExpr(expr);
  if(tokens.length === 0) return null;

  const opSt = [];
  const out = [];

  for(const t of tokens){
    if(isOperand(t)){
      out.push(t);
    } else if(isOpen(t)){
      opSt.push(t);
    } else if(isClose(t)){
      while(opSt.length && !isOpen(opSt[opSt.length-1])){
        out.push(opSt.pop());
      }
      if(opSt.length && isOpen(opSt[opSt.length-1])){
        opSt.pop(); // discard opening
      } else {
        return null;
      }
    } else if(isOperator(t)){
      while(opSt.length && isOperator(opSt[opSt.length-1])){
        const top = opSt[opSt.length-1];
        const shouldPop = (t === "^") ? (prec(top) > prec(t)) : (prec(top) >= prec(t));
        if(!shouldPop) break;
        out.push(opSt.pop());
      }
      opSt.push(t);
    } else {
      // ignore
    }
  }

  while(opSt.length){
    const top = opSt.pop();
    if(isOpen(top)) return null;
    out.push(top);
  }
  return out.join(" ");
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

$("#btnConvertPrefix").addEventListener("click", async ()=>{
  await infixToPrefixAnimated(infix2Input.value.trim());
});
$("#btnPrefixAnim").addEventListener("click", async ()=>{
  if(!infix2Input.value.trim()) infix2Input.value = "2+3*1";
  await infixToPrefixAnimated(infix2Input.value.trim());
});

// =========================
// POSTFIX EVALUATION (ANIMATED)
// =========================
const postfixInput = $("#postfixInput");
const evalStatus = $("#evalStatus");
const evalResult = $("#evalResult");
const evalTape = $("#evalTape");
const evalStackViz = $("#evalStackViz");
const evalLog = $("#evalLog");

function clearEval(){
  postfixInput.value = "";
  evalTape.innerHTML = "";
  evalStackViz.innerHTML = "";
  evalLog.innerHTML = "";
  evalResult.textContent = "—";
  setBadge(evalStatus, "Waiting…", "warn");
}
$("#btnClearEval").addEventListener("click", clearEval);
$("#btnEvalExample").addEventListener("click", ()=>{ postfixInput.value = "2 3 1 * + 9 -"; });

$("#btnEvalPostfix").addEventListener("click", async ()=>{
  evalTape.innerHTML = "";
  evalStackViz.innerHTML = "";
  evalLog.innerHTML = "";
  evalResult.textContent = "—";
  setBadge(evalStatus, "Evaluating…", "warn");

  const raw = postfixInput.value.trim();
  if(!raw){
    setBadge(evalStatus, "Enter postfix tokens with spaces", "warn");
    logLine(evalLog, "warn", "No input.");
    return;
  }

  const tokens = raw.split(/\s+/).filter(Boolean);
  const chips = renderTape(evalTape, tokens);

  const st = [];
  const refresh = () => {
    evalStackViz.innerHTML = "";
    for(const v of st){
      evalStackViz.appendChild(makeNode(v, "miniNode"));
    }
  };

  const applyOp = (a,b,op) => {
    const x = Number(a), y = Number(b);
    if(Number.isNaN(x) || Number.isNaN(y)) return null;
    switch(op){
      case "+": return x + y;
      case "-": return x - y;
      case "*": return x * y;
      case "/": return y === 0 ? null : x / y;
      case "^": return Math.pow(x,y);
      default: return null;
    }
  };

  for(let i=0;i<tokens.length;i++){
    chips.forEach(c=>c.classList.remove("active"));
    chips[i].classList.add("active");
    const t = tokens[i];

    if(/^-?\d+(\.\d+)?$/.test(t)){
      st.push(t);
      refresh();
      logLine(evalLog, "good", `Read ${t} → push`);
    } else if(isOperator(t)){
      if(st.length < 2){
        setBadge(evalStatus, "Invalid postfix (not enough operands)", "bad");
        logLine(evalLog, "bad", `Operator ${t}: needs two operands → UNDERFLOW`);
        return;
      }
      const b = st.pop();
      const a = st.pop();
      refresh();
      logLine(evalLog, "warn", `Operator ${t}: pop b=${b}, a=${a} → compute a ${t} b`);
      const res = applyOp(a,b,t);
      if(res === null){
        setBadge(evalStatus, "Math error", "bad");
        logLine(evalLog, "bad", "Computation failed (maybe divide by zero).");
        return;
      }
      st.push(String(res));
      refresh();
      logLine(evalLog, "good", `Push result ${res}`);
    } else {
      setBadge(evalStatus, "Invalid token", "bad");
      logLine(evalLog, "bad", `Unknown token: ${t}`);
      return;
    }
    await sleep(520);
  }

  if(st.length !== 1){
    setBadge(evalStatus, "Invalid postfix (final stack size != 1)", "bad");
    logLine(evalLog, "bad", `End: stack size = ${st.length}`);
    return;
  }

  evalResult.textContent = st[0];
  setBadge(evalStatus, "Done ✅", "good");
  logLine(evalLog, "good", `Final answer = ${st[0]}`);
});

// cheat sheet eval demo
$("#btnCheatEvalDemo").addEventListener("click", async ()=>{
  activateView("exprView");
  postfixInput.value = "2 3 1 * + 9 -";
  $("#btnEvalPostfix").click();
});

// =========================
// PREFIX EVALUATION (ANIMATED)


// =========================
// Prefix helper: animate infix->postfix into custom UI boxes
// (Used by the Prefix converter)
// =========================
async function infixToPostfixAnimatedToUI(expr, tapeEl, opVizEl, outEl, logEl, statusEl){
  // Clear UI
  tapeEl.innerHTML = "";
  opVizEl.innerHTML = "";
  outEl.innerHTML = "";
  if(logEl) logEl.innerHTML = "";

  const tokens = tokenizeExpr(expr);
  if(tokens.length === 0){
    if(statusEl) setBadge(statusEl, "Enter expression", "warn");
    return null;
  }

  if(statusEl) setBadge(statusEl, "Converting…", "warn");
  const chips = renderTape(tapeEl, tokens);

  const opSt = [];
  const out = [];

  const refreshOp = () => {
    opVizEl.innerHTML = "";
    for(const v of opSt){
      opVizEl.appendChild(makeNode(v, "miniNode"));
    }
  };

  const pushOutTok = (t) => {
    const tok = document.createElement("div");
    tok.className = "outToken";
    tok.textContent = t;
    outEl.appendChild(tok);
  };

  const popOpToOut = async () => {
    const last = opVizEl.lastElementChild;
    if(last){ last.classList.add("removing"); await sleep(200); }
    const v = opSt.pop();
    refreshOp();
    out.push(v);
    pushOutTok(v);
    if(logEl) logLine(logEl, "good", `Pop ${v} → output`);
  };

  for(let i=0;i<tokens.length;i++){
    chips.forEach(c=>c.classList.remove("active"));
    chips[i].classList.add("active");

    const t = tokens[i];

    if(isOperand(t)){
      out.push(t);
      pushOutTok(t);
      if(logEl) logLine(logEl, "good", `Operand ${t} → output`);
    }
    else if(isOpen(t)){
      opSt.push(t);
      refreshOp();
      if(logEl) logLine(logEl, "warn", `Push ${t}`);
    }
    else if(isClose(t)){
      if(logEl) logLine(logEl, "warn", `) found → pop until (`);

      while(opSt.length && !isOpen(opSt[opSt.length-1])){
        await popOpToOut();
        await sleep(80);
      }

      if(opSt.length && isOpen(opSt[opSt.length-1])){
        const last = opVizEl.lastElementChild;
        if(last){ last.classList.add("removing"); await sleep(200); }
        const open = opSt.pop(); // discard '('
        refreshOp();
        if(logEl) logLine(logEl, "good", `Discard ${open}`);
      }else{
        if(statusEl) setBadge(statusEl, "Invalid (missing opening)", "bad");
        return null;
      }
    }
    else if(isOperator(t)){
      // Pop higher precedence (or equal if left-assoc)
      while(opSt.length && isOperator(opSt[opSt.length-1])){
        const top = opSt[opSt.length-1];

        const shouldPop = (t === "^")
          ? (prec(top) > prec(t))      // ^ is right-assoc
          : (prec(top) >= prec(t));    // others left-assoc

        if(!shouldPop) break;

        await popOpToOut();
        await sleep(80);
      }

      opSt.push(t);
      refreshOp();
      if(logEl) logLine(logEl, "good", `Push operator ${t}`);
    }
    else{
      // ignore unknown
      if(logEl) logLine(logEl, "warn", `Ignored token: ${t}`);
    }

    await sleep(320);
  }

  // Pop remaining ops
  while(opSt.length){
    const top = opSt[opSt.length-1];
    if(isOpen(top)){
      if(statusEl) setBadge(statusEl, "Invalid (unclosed bracket)", "bad");
      return null;
    }
    await popOpToOut();
    await sleep(80);
  }

  if(statusEl) setBadge(statusEl, "Done ✅", "good");
  return out.join(" ");
}



async function infixToPrefixAnimated(infix){
  const cleaned = (infix || "").replace(/\s+/g,"");
  if(!cleaned){
    setBadge(prefixStatus, "Enter an infix expression", "warn");
    prefixSteps.textContent = "Steps will appear here.";
    return null;
  }

  setBadge(prefixStatus, "Step 1: Reverse + Swap…", "warn");
  const reversed = reverseAndSwap(cleaned);

  prefixSteps.innerHTML =
    `<b>Step 1:</b> Reverse + swap brackets → <code>${escapeHtml(reversed)}</code><br/>` +
    `<b>Step 2:</b> Convert this to POSTFIX (animated below).<br/>` +
    `<b>Step 3:</b> Reverse postfix result → PREFIX.`;

  // Animate postfix conversion for the reversed expression
  const tapeEl = $("#prefixTape");
  const opEl = $("#prefixOpStackViz");
  const outEl = $("#prefixPostfixOut");

  const postfix = await infixToPostfixAnimatedToUI(
    reversed,
    tapeEl,
    opEl,
    outEl,
    null,        // no log needed (or pass an element if you want)
    prefixStatus
  );

  if(postfix === null) return null;

  // Animate final reverse (simple)
  setBadge(prefixStatus, "Step 3: Reverse postfix → Prefix", "warn");
  await sleep(350);

  const prefix = postfix.split(/\s+/).filter(Boolean).reverse().join(" ");
  $("#prefixFinalText").textContent = prefix;

  setBadge(prefixStatus, "Done ✅ Prefix: " + prefix, "good");
  return prefix;
}
// =========================
const prefixEvalInput = $("#prefixEvalInput");
const prefixEvalStatus = $("#prefixEvalStatus");
const prefixEvalResult = $("#prefixEvalResult");
const prefixEvalTape = $("#prefixEvalTape");
const prefixEvalStackViz = $("#prefixEvalStackViz");
const prefixEvalLog = $("#prefixEvalLog");

function clearPrefixEval(){
  prefixEvalInput.value = "";
  prefixEvalTape.innerHTML = "";
  prefixEvalStackViz.innerHTML = "";
  prefixEvalLog.innerHTML = "";
  prefixEvalResult.textContent = "—";
  setBadge(prefixEvalStatus, "Waiting…", "warn");
}
$("#btnClearPrefixEval").addEventListener("click", clearPrefixEval);
$("#btnPrefixEvalExample").addEventListener("click", ()=>{
  prefixEvalInput.value = "- + 2 * 3 1 9";
});

$("#btnEvalPrefix").addEventListener("click", async ()=>{
  prefixEvalTape.innerHTML = "";
  prefixEvalStackViz.innerHTML = "";
  prefixEvalLog.innerHTML = "";
  prefixEvalResult.textContent = "—";
  setBadge(prefixEvalStatus, "Evaluating…", "warn");

  const raw = prefixEvalInput.value.trim();
  if(!raw){
    setBadge(prefixEvalStatus, "Enter prefix tokens with spaces", "warn");
    return;
  }

  const tokens = raw.split(/\s+/).filter(Boolean);
  const chips = renderTape(prefixEvalTape, tokens);

  const st = [];
  const refresh = () => {
    prefixEvalStackViz.innerHTML = "";
    for(const v of st){
      prefixEvalStackViz.appendChild(makeNode(v, "miniNode"));
    }
  };

  const applyOp = (a,b,op) => {
    const x = Number(a), y = Number(b);
    if(Number.isNaN(x) || Number.isNaN(y)) return null;
    switch(op){
      case "+": return x + y;
      case "-": return x - y;
      case "*": return x * y;
      case "/": return y === 0 ? null : x / y;
      case "^": return Math.pow(x,y);
      default: return null;
    }
  };

  // Scan RIGHT → LEFT
  for(let i=tokens.length-1;i>=0;i--){
    chips.forEach(c=>c.classList.remove("active"));
    chips[i].classList.add("active");
    const t = tokens[i];

    if(/^-?\d+(\.\d+)?$/.test(t)){
      st.push(t);
      refresh();
      logLine(prefixEvalLog, "good", `Read ${t} → push`);
    } else if(isOperator(t)){
      if(st.length < 2){
        setBadge(prefixEvalStatus, "Invalid prefix (not enough operands)", "bad");
        logLine(prefixEvalLog, "bad", `Operator ${t}: needs two operands → UNDERFLOW`);
        return;
      }
      const a = st.pop(); // in prefix when scanning R->L, first pop is operand1
      const b = st.pop();
      refresh();
      logLine(prefixEvalLog, "warn", `Operator ${t}: pop a=${a}, b=${b} → compute a ${t} b`);
      const res = applyOp(a,b,t);
      if(res === null){
        setBadge(prefixEvalStatus, "Math error", "bad");
        logLine(prefixEvalLog, "bad", "Computation failed.");
        return;
      }
      st.push(String(res));
      refresh();
      logLine(prefixEvalLog, "good", `Push result ${res}`);
    } else {
      setBadge(prefixEvalStatus, "Invalid token", "bad");
      logLine(prefixEvalLog, "bad", `Unknown token: ${t}`);
      return;
    }
    await sleep(520);
  }

  if(st.length !== 1){
    setBadge(prefixEvalStatus, "Invalid prefix (final stack size != 1)", "bad");
    logLine(prefixEvalLog, "bad", `End: stack size = ${st.length}`);
    return;
  }

  prefixEvalResult.textContent = st[0];
  setBadge(prefixEvalStatus, "Done ✅", "good");
  logLine(prefixEvalLog, "good", `Final answer = ${st[0]}`);
});

// =========================
// QUEUE (FIFO)
// =========================
const queue = [];
const queueViz = $("#queueViz");
const queueLog = $("#queueLog");
const queueStatus = $("#queueStatus");
const queueSize = $("#queueSize");
const queueInput = $("#queueInput");

function refreshQueue(){
  queueViz.innerHTML = "";
  for(const v of queue){
    const n = makeNode(v, "qNode");
    queueViz.appendChild(n);
  }
  queueSize.textContent = String(queue.length);
  if(queue.length === 0) setBadge(queueStatus, "Empty", "warn");
  else setBadge(queueStatus, `Ready (Front=${queue[0]}, Rear=${queue[queue.length-1]})`, "good");
}

async function enqueue(vOverride=null){
  const v = (vOverride ?? queueInput.value).trim();
  if(!v){
    logLine(queueLog, "warn", "enqueue: enter a value first.");
    setBadge(queueStatus, "No value provided", "warn");
    return;
  }
  queue.push(v);
  logLine(queueLog, "good", `enqueue(${v}) → goes to REAR.`);
  refreshQueue();
  queueInput.value = "";
  await sleep(180);
}

async function dequeue(){
  if(queue.length === 0){
    logLine(queueLog, "bad", "dequeue() → UNDERFLOW (queue is empty).");
    setBadge(queueStatus, "Underflow", "bad");
    return null;
  }
  const first = queueViz.firstElementChild;
  if(first){
    first.classList.add("removing");
    await sleep(220);
  }
  const v = queue.shift();
  logLine(queueLog, "good", `dequeue() → removed ${v} from FRONT.`);
  refreshQueue();
  await sleep(120);
  return v;
}

function front(){
  if(queue.length === 0){
    logLine(queueLog, "bad", "front() → UNDERFLOW (queue is empty).");
    setBadge(queueStatus, "Underflow", "bad");
    return null;
  }
  logLine(queueLog, "good", `front() → ${queue[0]}`);
  setBadge(queueStatus, `Front = ${queue[0]}`, "good");
  return queue[0];
}

function clearQueue(){
  queue.length = 0;
  queueLog.innerHTML = "";
  refreshQueue();
  logLine(queueLog, "warn", "queue cleared.");
}

$("#btnEnq").addEventListener("click", ()=> enqueue());
$("#btnDeq").addEventListener("click", dequeue);
$("#btnFront").addEventListener("click", front);
$("#btnClearQueue").addEventListener("click", clearQueue);

$("#btnQueueDemo").addEventListener("click", async ()=>{
  clearQueue();
  await enqueue("2");
  await sleep(250);
  await enqueue("10");
  await sleep(250);
  await dequeue();
  await sleep(250);
  await enqueue("7");
  await sleep(250);
  front();
});

$("#btnLearnQueueAnim").addEventListener("click", async ()=>{
  activateView("queueView");
  $("#btnQueueDemo").click();
});

refreshQueue();

// =========================
// CIRCULAR QUEUE
// =========================
const CQ_SIZE = 8;
let cq = Array(CQ_SIZE).fill(null);
let cqFront = 0;
let cqRear = -1;
let cqCount = 0;

const ring = $("#ring");
const cqueueLog = $("#cqueueLog");
const cqueueStatus = $("#cqueueStatus");
const cqFrontLabel = $("#cqFront");
const cqRearLabel = $("#cqRear");
const cqueueInput = $("#cqueueInput");

function ringLayout(){
  ring.innerHTML = "";
  const cx = 160, cy = 160;
  const radius = 120;

  for(let i=0;i<CQ_SIZE;i++){
    const angle = (Math.PI * 2) * (i / CQ_SIZE) - Math.PI/2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    const slot = document.createElement("div");
    slot.className = "slot";
    slot.style.left = x + "px";
    slot.style.top = y + "px";
    slot.style.transform = "translate(-50%, -50%)";

    const val = cq[i];
    slot.textContent = val === null ? String(i) : String(val);
    if(val !== null) slot.classList.add("filled");
    ring.appendChild(slot);
  }

  const frontPtr = document.createElement("div");
  frontPtr.className = "pointer";
  frontPtr.innerHTML = `front: <b>${cqFront}</b>`;

  const rearPtr = document.createElement("div");
  rearPtr.className = "pointer";
  rearPtr.innerHTML = `rear: <b>${cqRear}</b>`;

  const posPtr = (idx, el, offsetR) => {
    let id = idx;
    if(id < 0) id = 0;
    const angle = (Math.PI * 2) * (id / CQ_SIZE) - Math.PI/2;
    const x = cx + (radius + offsetR) * Math.cos(angle);
    const y = cy + (radius + offsetR) * Math.sin(angle);
    el.style.left = x + "px";
    el.style.top = y + "px";
  };

  posPtr(cqFront, frontPtr, 42);
  posPtr(cqRear < 0 ? 0 : cqRear, rearPtr, 68);
  ring.appendChild(frontPtr);
  ring.appendChild(rearPtr);

  cqFrontLabel.textContent = String(cqFront);
  cqRearLabel.textContent = String(cqRear);
}

function cqIsFull(){ return cqCount === CQ_SIZE; }
function cqIsEmpty(){ return cqCount === 0; }

async function cqEnqueue(vOverride=null){
  const v = (vOverride ?? cqueueInput.value).trim();
  if(!v){
    setBadge(cqueueStatus, "Enter a value first", "warn");
    logLine(cqueueLog, "warn", "enqueue: no value provided.");
    return;
  }
  if(cqIsFull()){
    setBadge(cqueueStatus, "Overflow (full)", "bad");
    logLine(cqueueLog, "bad", "enqueue: OVERFLOW.");
    return;
  }
  cqRear = (cqRear + 1) % CQ_SIZE;
  cq[cqRear] = v;
  cqCount++;
  ringLayout();
  setBadge(cqueueStatus, `Enqueued ${v} at index ${cqRear}`, "good");
  logLine(cqueueLog, "good", `rear = (rear+1)%size → ${cqRear}`);
  cqueueInput.value = "";
  await sleep(180);
}

async function cqDequeue(){
  if(cqIsEmpty()){
    setBadge(cqueueStatus, "Underflow (empty)", "bad");
    logLine(cqueueLog, "bad", "dequeue: UNDERFLOW.");
    return;
  }
  const v = cq[cqFront];
  cq[cqFront] = null;
  cqFront = (cqFront + 1) % CQ_SIZE;
  cqCount--;
  ringLayout();
  setBadge(cqueueStatus, `Dequeued ${v}`, "good");
  logLine(cqueueLog, "good", `front = (front+1)%size → ${cqFront}`);
  await sleep(180);
}

function cqReset(){
  cq = Array(CQ_SIZE).fill(null);
  cqFront = 0;
  cqRear = -1;
  cqCount = 0;
  cqueueLog.innerHTML = "";
  ringLayout();
  setBadge(cqueueStatus, "Ready", "warn");
  logLine(cqueueLog, "warn", "circular queue reset.");
}

$("#btnCEnq").addEventListener("click", ()=> cqEnqueue());
$("#btnCDeq").addEventListener("click", cqDequeue);
$("#btnCReset").addEventListener("click", cqReset);

$("#btnCAnim").addEventListener("click", async ()=>{
  cqReset();
  await cqEnqueue("A");
  await cqEnqueue("B");
  await cqEnqueue("C");
  await cqDequeue();
  await cqDequeue();
  await cqEnqueue("D");
  await cqEnqueue("E");
  // show wrap-around
  await cqEnqueue("F");
  await cqEnqueue("G");
  await cqEnqueue("H");
  await cqEnqueue("I"); // may overflow depending on count
});

ringLayout();
setBadge(cqueueStatus, "Ready", "warn");

// Learn view queue animation
$("#btnLearnQueueAnim").addEventListener("click", async ()=>{
  activateView("queueView");
  $("#btnCAnim").click();
});

// =========================
// Learn view extra animations
// =========================
$("#btnCheatConvertDemo").addEventListener("click", async ()=>{
  activateView("exprView");
  infixInput.value = "(2+3)*1";
  await infixToPostfixAnimated(infixInput.value.trim());
});

$("#btnLearnQueueAnim").addEventListener("click", async ()=>{
  activateView("queueView");
  $("#btnQueueDemo").click();
});

$("#btnLearnStackAnim").addEventListener("click", async ()=>{
  activateView("stackView");
  $("#btnStackDemo").click();
});

// =========================
// QUIZ (60 questions)
// =========================
const quizList = $("#quizList");

const quizData = [
  // =========================
  // STACK BASICS + TRACING (Q1–Q15)
  // =========================
  {
    id:"Q1",
    q:"After: push(5), push(3), pop(), top() — what is top()?",
    choices:["A) 5","B) 3","C) Empty","D) Error"],
    ans:"A",
    explain:"push 5 → [5], push 3 → [5,3], pop removes 3 → [5], top = 5."
  },
  {
    id:"Q2",
    q:"Stack principle is:",
    choices:["A) FIFO","B) LIFO","C) Random","D) Sorted"],
    ans:"B",
    explain:"Stack follows LIFO: Last In First Out."
  },
  {
    id:"Q3",
    q:"Which operation does NOT remove an element from a stack?",
    choices:["A) pop()","B) top()","C) all above","D) (none)"],
    ans:"B",
    explain:"top() only reads the top element without removing it."
  },
  {
    id:"Q4",
    q:"Trace: push(10), push(20), push(30), pop(), top() — final top() is:",
    choices:["A) 10","B) 20","C) 30","D) Empty"],
    ans:"B",
    explain:"After pop() removes 30, stack is [10,20], so top is 20."
  },
  {
    id:"Q5",
    q:"If a stack is implemented using an array of fixed size, pushing into a full stack causes:",
    choices:["A) Underflow","B) Overflow","C) Balanced","D) Wrap-around"],
    ans:"B",
    explain:"Overflow = inserting into a full fixed-size structure."
  },
  {
    id:"Q6",
    q:"Underflow happens when:",
    choices:["A) push on full stack","B) pop on empty stack","C) push on empty stack","D) size() called"],
    ans:"B",
    explain:"Underflow = removing from an empty structure."
  },
  {
    id:"Q7",
    q:"Trace: push(A), push(B), top(), push(C), pop(), top() — final top() is:",
    choices:["A) A","B) B","C) C","D) Empty"],
    ans:"B",
    explain:"Stack ends as [A,B], so top is B."
  },
  {
    id:"Q8",
    q:'Reverse "ABC" using a stack. Output?',
    choices:["A) ABC","B) CBA","C) BCA","D) CAB"],
    ans:"B",
    explain:"Push A,B,C then pop → C,B,A."
  },
  {
    id:"Q9",
    q:"Which one is a real-life stack example?",
    choices:["A) Waiting line at cashier","B) Printer queue","C) Browser Back button","D) Circular buffer"],
    ans:"C",
    explain:"Browser back is LIFO: last visited page is returned first."
  },
  {
    id:"Q10",
    q:"Time complexity of push/pop/top in typical stack implementation is:",
    choices:["A) O(n)","B) O(log n)","C) O(1)","D) O(n²)"],
    ans:"C",
    explain:"They operate at the top only, usually constant time."
  },
  {
    id:"Q11",
    q:"After: push(1), push(2), push(3), pop(), pop() — stack is:",
    choices:["A) [1]","B) [2]","C) [3]","D) Empty"],
    ans:"A",
    explain:"Pop removes 3 then 2 → remaining [1]."
  },
  {
    id:"Q12",
    q:"If the stack is empty, calling pop() results in:",
    choices:["A) returns 0","B) removes last element","C) Underflow error","D) creates element"],
    ans:"C",
    explain:"pop() removes the top element; if stack is empty → underflow."
  },
  {
    id:"Q13",
    q:"If stack has elements [X,Y,Z] where Z is top, pop() returns:",
    choices:["A) X","B) Y","C) Z","D) None"],
    ans:"C",
    explain:"pop removes and returns the top element."
  },
  {
    id:"Q14",
    q:"Which operation adds a new element to the top of stack?",
    choices:["A) enqueue","B) push","C) front","D) remove"],
    ans:"B",
    explain:"push inserts at the top."
  },
  {
    id:"Q15",
    q:"If you push n elements then pop n elements, final stack state is:",
    choices:["A) Full","B) Empty","C) Half-full","D) Error"],
    ans:"B",
    explain:"All pushed elements are removed."
  },

  // =========================
  // BALANCED + DUPLICATE PARENTHESES (Q16–Q25)
  // =========================
  {
    id:"Q16",
    q:"Which data structure is used to check balanced parentheses?",
    choices:["A) Queue","B) Stack","C) Tree","D) Hash table"],
    ans:"B",
    explain:"We must match the last opening bracket with the next closing bracket → LIFO."
  },
  {
    id:"Q17",
    q:"Which expression is unbalanced?",
    choices:["A) (())","B) ()()","C) (()","D) ((()))"],
    ans:"C",
    explain:"(() is missing one closing ')'."
  },
  {
    id:"Q18",
    q:"Expression: (a+[b*c]-{d/e}) is:",
    choices:["A) Balanced","B) Unbalanced","C) Duplicate","D) Not checkable"],
    ans:"A",
    explain:"All opening brackets have matching closing brackets in correct order."
  },
  {
    id:"Q19",
    q:"Expression: ([)] is:",
    choices:["A) Balanced","B) Unbalanced (mismatch)","C) Duplicate","D) Balanced if ignore types"],
    ans:"B",
    explain:"Order mismatch: '(' is opened, but ']' closes first."
  },
  {
    id:"Q20",
    q:"Duplicate parentheses exist in:",
    choices:["A) (x+y)","B) ((x+y))","C) (x+y)+z","D) (x+(y+z))"],
    ans:"B",
    explain:"((x+y)) has an extra redundant pair."
  },
  {
    id:"Q21",
    q:"For input ((x+y))+z, does it contain duplicate parentheses?",
    choices:["A) Yes","B) No","C) Error","D) Depends"],
    ans:"A",
    explain:"((x+y)) contains an extra pair around (x+y)."
  },
  {
    id:"Q22",
    q:"In balanced parentheses checking, when reading a closing bracket ')', you should:",
    choices:["A) push it","B) pop and match '('","C) ignore it","D) clear the stack"],
    ans:"B",
    explain:"Closing bracket must match the most recent opening bracket."
  },
  {
    id:"Q23",
    q:"If at the end of scanning brackets, the stack is not empty, then:",
    choices:["A) Expression is balanced","B) Expression is not balanced","C) Expression has duplicate","D) It’s always balanced"],
    ans:"B",
    explain:"Unmatched opening brackets remain."
  },
  {
    id:"Q24",
    q:"Classic duplicate parentheses detection: when you see ')', duplicate exists if:",
    choices:["A) top of stack is '(' immediately","B) stack is empty","C) top is '+'","D) top is a digit"],
    ans:"A",
    explain:"If '()' with nothing inside, that pair is duplicate."
  },
  {
    id:"Q25",
    q:"Expression: (a+b)) is:",
    choices:["A) Balanced","B) Unbalanced extra closing","C) Duplicate only","D) Always balanced"],
    ans:"B",
    explain:"There is an extra ')' with no matching '('."
  },

  // =========================
  // PRECEDENCE + ASSOCIATIVITY + NOTATION (Q26–Q33)
  // =========================
  {
    id:"Q26",
    q:"Operator precedence (highest → lowest) is:",
    choices:["A) + - then * / then ^","B) ^ then * / then + -","C) * / then ^ then + -","D) all same"],
    ans:"B",
    explain:"Standard: ^ highest, then * and /, then + and -."
  },
  {
    id:"Q27",
    q:"Associativity of '^' is usually:",
    choices:["A) Left-to-right","B) Right-to-left","C) No associativity","D) Random"],
    ans:"B",
    explain:"Exponentiation is commonly right-associative."
  },
  {
    id:"Q28",
    q:"In expression 2+3*4, the first operation done is:",
    choices:["A) 2+3","B) 3*4","C) (2+3)*4","D) none"],
    ans:"B",
    explain:"* has higher precedence than +."
  },
  {
    id:"Q29",
    q:"In expression (2+3)*4, the first operation done is:",
    choices:["A) 2+3","B) 3*4","C) 2*4","D) none"],
    ans:"A",
    explain:"Parentheses force + first."
  },
  {
    id:"Q30",
    q:"Infix expression format is:",
    choices:["A) operator operand operand","B) operand operand operator","C) operand operator operand","D) none"],
    ans:"C",
    explain:"Infix places the operator between operands."
  },
  {
    id:"Q31",
    q:"Postfix expression format is:",
    choices:["A) operator operand operand","B) operand operand operator","C) operand operator operand","D) operator at start"],
    ans:"B",
    explain:"Postfix places the operator after its operands."
  },
  {
    id:"Q32",
    q:"Prefix expression format is:",
    choices:["A) operator operand operand","B) operand operand operator","C) operand operator operand","D) operator at end"],
    ans:"A",
    explain:"Prefix places the operator before operands."
  },
  {
    id:"Q33",
    q:"Which operator has the highest precedence?",
    choices:["A) +","B) -","C) *","D) ^"],
    ans:"D",
    explain:"^ is highest."
  },

  // =========================
  // INFIX -> POSTFIX (Q34–Q45)
  // =========================
  {
    id:"Q34",
    q:"Convert infix to postfix: 2+3*1",
    choices:["A) 231*+","B) 23+1*","C) 231+*","D) 2 3 + 1 *"],
    ans:"A",
    explain:"3*1 first → 2 (3 1 *) + → 231*+."
  },
  {
    id:"Q35",
    q:"Convert infix to postfix: (2+3)*1",
    choices:["A) 23+1*","B) 231*+","C) 231+*","D) 2 3 1 + *"],
    ans:"A",
    explain:"(2+3) first → 23+ then *1 → 23+1*."
  },
  {
    id:"Q36",
    q:"Convert infix to postfix: A+B*C",
    choices:["A) AB+C*","B) ABC*+","C) A+BC*","D) AB*C+"],
    ans:"B",
    explain:"B*C first, then add A → A (B C *) + → ABC*+."
  },
  {
    id:"Q37",
    q:"Convert infix to postfix: (A+B)*C",
    choices:["A) AB+C*","B) ABC*+","C) A*BC+","D) AB*C+"],
    ans:"A",
    explain:"(A+B) → AB+, then *C → AB+C*."
  },
  {
    id:"Q38",
    q:"Convert infix to postfix: A*B+C",
    choices:["A) AB*C+","B) ABC+*","C) A*BC+","D) AB+*C"],
    ans:"A",
    explain:"A*B first → AB* then +C → AB*C+."
  },
  {
    id:"Q39",
    q:"Convert infix to postfix: A*(B+C)",
    choices:["A) ABC+*","B) AB*C+","C) AB+*C","D) A*BC+"],
    ans:"A",
    explain:"(B+C) → BC+, then A* → ABC+*."
  },
  {
    id:"Q40",
    q:"Convert infix to postfix: A+B*C-D",
    choices:["A) ABC*+D-","B) ABC*D+-","C) AB+C*D-","D) AB*C+D-"],
    ans:"A",
    explain:"B*C first → A+(...) then subtract D → ABC*+D-."
  },
  {
    id:"Q41",
    q:"Convert infix to postfix: (A+B)*(C-D)",
    choices:["A) AB+CD-*","B) AB+CD*-","C) ABCD+-*","D) AB*CD+-"],
    ans:"A",
    explain:"(A+B) → AB+, (C-D) → CD-, multiply → AB+CD-*."
  },
  {
    id:"Q42",
    q:"During infix→postfix, when you read an operand you should:",
    choices:["A) push to operator stack","B) add directly to output","C) discard it","D) pop stack"],
    ans:"B",
    explain:"Operands go directly to output."
  },
  {
    id:"Q43",
    q:"During infix→postfix, when you read '(', you should:",
    choices:["A) output it","B) push it to stack","C) ignore it","D) pop stack"],
    ans:"B",
    explain:"Opening bracket is pushed to stack to mark grouping."
  },
  {
    id:"Q44",
    q:"During infix→postfix, when you read ')', you should:",
    choices:["A) push it","B) pop until '(' then discard '('","C) output ')'","D) ignore everything"],
    ans:"B",
    explain:"Pop operators inside parentheses, then remove '('."
  },
  {
    id:"Q45",
    q:"In infix→postfix conversion, the stack is mainly used to store:",
    choices:["A) operands","B) operators and brackets","C) final answer","D) only digits"],
    ans:"B",
    explain:"Operators are delayed by precedence; parentheses are tracked."
  },

  // =========================
  // INFIX -> PREFIX (Q46–Q52)
  // =========================
  {
    id:"Q46",
    q:"Infix → Prefix conversion method begins with:",
    choices:["A) Convert directly","B) Reverse infix and swap parentheses","C) Evaluate expression","D) Convert to postfix then stop"],
    ans:"B",
    explain:"Prefix method: reverse + swap (), convert to postfix, reverse result."
  },
  {
    id:"Q47",
    q:"Convert infix to prefix: A+B*C",
    choices:["A) +A*BC","B) *+ABC","C) A*B+C","D) +*ABC"],
    ans:"A",
    explain:"B*C first → + A (* B C)."
  },
  {
    id:"Q48",
    q:"Convert infix to prefix: (A+B)*C",
    choices:["A) *+ABC","B) +A*BC","C) AB+C*","D) *A+BC"],
    ans:"A",
    explain:"(A+B) first then multiply by C."
  },
  {
    id:"Q49",
    q:"Convert infix to prefix: 2+3*1",
    choices:["A) +2*31","B) *+231","C) 231*+","D) +*231"],
    ans:"A",
    explain:"3*1 first → + 2 (* 3 1)."
  },
  {
    id:"Q50",
    q:"After reversing infix in prefix method, you must swap:",
    choices:["A) + and -","B) * and /","C) ( and )","D) digits and letters"],
    ans:"C",
    explain:"Swap parentheses to keep the correct grouping."
  },
  {
    id:"Q51",
    q:"Final step to get prefix (after postfix of reversed expression) is:",
    choices:["A) reverse postfix output","B) evaluate output","C) delete operators","D) enqueue output"],
    ans:"A",
    explain:"Reverse postfix tokens to get prefix."
  },
  {
    id:"Q52",
    q:"Which is a valid prefix expression?",
    choices:["A) AB+","B) A+B","C) +AB","D) A B +"],
    ans:"C",
    explain:"Prefix must have operator first."
  },

  // =========================
  // POSTFIX EVALUATION (Q53–Q56)
  // =========================
  {
    id:"Q53",
    q:"Evaluate postfix: 2 3 1 * +",
    choices:["A) 5","B) 6","C) 9","D) 10"],
    ans:"A",
    explain:"3*1=3 then 2+3=5."
  },
  {
    id:"Q54",
    q:"Evaluate postfix: 2 3 + 4 *",
    choices:["A) 14","B) 16","C) 20","D) 24"],
    ans:"C",
    explain:"2+3=5 then 5*4=20."
  },
  {
    id:"Q55",
    q:"Evaluate postfix: 8 2 / 3 -",
    choices:["A) 1","B) 4","C) -1","D) 7"],
    ans:"A",
    explain:"8/2=4 then 4-3=1."
  },
  {
    id:"Q56",
    q:"In postfix evaluation, when an operator appears you pop:",
    choices:["A) one operand","B) two operands","C) three operands","D) all operands"],
    ans:"B",
    explain:"Binary operators require two operands."
  },

  // =========================
  // PREFIX EVALUATION (Q57–Q60)
  // =========================
  {
    id:"Q57",
    q:"Prefix evaluation scanning direction is:",
    choices:["A) Left→Right","B) Right→Left","C) Any direction","D) Middle outward"],
    ans:"B",
    explain:"Prefix evaluation scans from right to left."
  },
  {
    id:"Q58",
    q:"Evaluate prefix: + 2 * 3 1",
    choices:["A) 5","B) 6","C) 9","D) 10"],
    ans:"A",
    explain:"* 3 1 = 3 then + 2 3 = 5."
  },
  {
    id:"Q59",
    q:"Evaluate prefix: - + 2 * 3 1 9",
    choices:["A) -4","B) 4","C) 5","D) -5"],
    ans:"A",
    explain:"*31=3, +2 3=5, 5-9=-4."
  },
  {
    id:"Q60",
    q:"In a queue, dequeue removes an element from:",
    choices:["A) Rear","B) Front","C) Top","D) Middle"],
    ans:"B",
    explain:"Queue is FIFO: remove from FRONT, insert at REAR."
  }
];

function renderQuiz(list){
  quizList.innerHTML = "";
  list.forEach(item=>{
    const card = document.createElement("div");
    card.className = "quizCard";

    const head = document.createElement("div");
    head.className = "qHead";

    const title = document.createElement("div");
    title.className = "qTitle";
    title.textContent = `${item.id}. ${item.q}`;

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "Show Answer";

    const body = document.createElement("div");
    body.className = "qBody";

    const choices = document.createElement("div");
    choices.className = "choices";
    item.choices.forEach(c=>{
      const d = document.createElement("div");
      d.className = "choice";
      d.textContent = c;
      choices.appendChild(d);
    });

    const ansBox = document.createElement("div");
    ansBox.className = "answerBox";
    ansBox.innerHTML = `<b>Answer:</b> ${item.ans}
      <div class="explain"><b>Why:</b> ${escapeHtml(item.explain)}</div>`;

    btn.addEventListener("click", ()=>{
      const showing = ansBox.classList.toggle("show");
      btn.textContent = showing ? "Hide Answer" : "Show Answer";
    });

    head.appendChild(title);
    head.appendChild(btn);

    body.appendChild(choices);
    body.appendChild(ansBox);

    card.appendChild(head);
    card.appendChild(body);

    quizList.appendChild(card);
  });
}

function shuffleArray(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

$("#btnLoadQuiz").addEventListener("click", ()=> renderQuiz(quizData));
$("#btnShuffleQuiz").addEventListener("click", ()=> renderQuiz(shuffleArray(quizData)));
$("#btnClearQuiz").addEventListener("click", ()=> quizList.innerHTML = "");

// Learn view expression demo
$("#btnLearnExprAnim").addEventListener("click", async ()=>{
  activateView("exprView");
  infixInput.value = "2+3*1";
  await infixToPostfixAnimated(infixInput.value.trim());
});

// Learn view queue demo
$("#btnLearnQueueAnim").addEventListener("click", async ()=>{
  activateView("queueView");
  $("#btnQueueDemo").click();
});

// =========================
// Extra: Learn page buttons (already wired)
// =========================
$("#btnCheatParenDemo").addEventListener("click", async ()=>{
  activateView("stackView");
  parenInput.value = "(())";
  $("#btnCheckParen").click();
});



















































































