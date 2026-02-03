// ===============================
// TA² Canvas SpeedGrader Injector
// ===============================

let latestSubmissionText = "";
let lastSentText = "";

// Collect text sent from iframe contexts
window.addEventListener("message", (event) => {
  if (event.data?.source === "TA2_SUBMISSION") {
    const box = document.getElementById("detectedText");
    if (!box) return;

    latestSubmissionText = event.data.text;

    const t = latestSubmissionText;
    box.textContent =
      t.length <= 150 ? t : t.slice(0, 75) + "\n...\n" + t.slice(-75);
  }
});

(function initTA2() {
  //const isCanvas = location.href.includes("speed_grader");
  //const isSandbox = location.hostname.includes("csb.app");
  // only block totally unrelated sites
  //if (!isCanvas && !isSandbox && window === window.top) return;

  // =========================
  // Extract text inside frames
  // =========================

  function cleanText(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function harvestText() {
    let foundText = "";

    // Canvas discussion + typed submissions
    const discussion = document.querySelector(".message.user_content.enhanced");
    if (discussion && discussion.innerText.trim()) {
      foundText = cleanText(discussion.innerText);
    }

    // Regular typed preview
    const rich = document.querySelector("#submission_preview");
    if (!foundText && rich && rich.innerText.trim()) {
      foundText = cleanText(rich.innerText);
    }

    // PDF / DOCX text layer
    const pdfText = document.querySelectorAll('span[role="presentation"]');
    if (!foundText && pdfText.length) {
      foundText = cleanText(
        Array.from(pdfText)
          .map((s) => s.innerText)
          .join(" ")
      );
    }

    // Only send if real content & changed (prevents flicker)
    const normalized = cleanText(foundText);

    if (normalized && normalized !== lastSentText) {
      lastSentText = normalized;
      window.top.postMessage(
        {
          source: "TA2_SUBMISSION",
          text: normalized,
        },
        "*"
      );
    }
  }

  // Canvas lazy-loads + swaps students constantly → poll
  setInterval(harvestText, 800);

  // =========================
  // Only build panel once (top frame)
  // =========================

  if (window !== window.top) return;
  if (document.getElementById("ta2-panel")) return;

  const panel = document.createElement("div");
  panel.id = "ta2-panel";
  document.body.appendChild(panel);

  panel.innerHTML = `
  <div class="title-row draggable">
    <h3>TA²</h3>
    <h5>Smart Grading Assistant</h5>
    <button id="collapseBtn">—</button>
  </div>

  <div id="panelContent">
    <h4>Rubric</h4>
    <textarea id="rubric" rows="4"></textarea>

    <div class="slider-group">
      <div class="slider-labels">
        <span>🙂 Encouraging</span>
        <span>😐 Neutral</span>
        <span>🧐 Critical</span>
      </div>
      <input type="range" id="toneSlider" min="0" max="2" step="1" value="1">
    </div>

    <div class="slider-group">
      <div class="slider-labels">
        <span>📝 Brief</span>
        <span>⚖️ Balanced</span>
        <span>📚 Detailed</span>
      </div>
      <input type="range" id="lengthSlider" min="0" max="2" step="1" value="1">
    </div>

    <button id="generate">Generate Feedback</button>
    <div id="detectedBox" style="font-size:12px; max-height:120px; overflow:auto; background:#f5f5f5; padding:6px; margin-bottom:6px; border-radius:6px;">
      <strong>Detected submission:</strong>
      <div id="detectedText"></div>
    </div>

    <div id="output"></div>


    <h6>
      TA² provides AI-generated grading suggestions and may make mistakes. 
      Please review and verify all feedback before finalizing grades.
      No student data is saved or logged.
    </h6>
  </div>

  <div id="miniBtn">TA²</div>
  `;

  // =========================
  // Dragging
  // =========================

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  function attachDrag(el) {
    if (!el) return;
    el.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
    });
  }

  attachDrag(document.querySelector(".draggable"));
  attachDrag(document.getElementById("miniBtn"));

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    const maxX = window.innerWidth - panel.offsetWidth;
    const maxY = window.innerHeight - panel.offsetHeight;

    panel.style.left = Math.max(0, Math.min(x, maxX)) + "px";
    panel.style.top = Math.max(0, Math.min(y, maxY)) + "px";
    panel.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // =========================
  // Collapse
  // =========================

  document.getElementById("collapseBtn").onclick = () => {
    panel.classList.add("collapsed");
  };

  document.getElementById("miniBtn").onclick = () => {
    panel.classList.remove("collapsed");
  };

  // =========================
  // Rubric persistence
  // =========================

  const rubricBox = document.getElementById("rubric");
  rubricBox.value = localStorage.getItem("ta2_rubric") || "";

  rubricBox.addEventListener("input", () => {
    localStorage.setItem("ta2_rubric", rubricBox.value);
  });

  // =========================
  // Helpers
  // =========================

  function limitSentences(text, max) {
    const sentences = text.match(/[^.!?]+[.!?]/g);
    if (!sentences) return text;

    return sentences.slice(0, max).join(" ").trim();
  }

  function limitFeedbackOnly(text, max) {
    const parts = text.split(/###\s*Feedback/i);

    // fallback if format breaks
    if (parts.length < 2) return limitSentences(text, max);

    const gradePart = parts[0].trim();
    const feedbackPart = parts[1];

    const trimmedFeedback = limitSentences(feedbackPart, max)
      .replace(/\s+/g, " ") // collapse multiple spaces
      .trim();

    return gradePart + "\n\nFeedback\n" + trimmedFeedback;
  }

  function forceLists(text) {
    return text.replace(
      /(Grade:\n)([\s\S]*?)(\n\nTotal:)/g,
      (_, g, items, t) =>
        g +
        items
          .trim()
          .split("\n")
          .map((l) => `- ${l}`)
          .join("\n") +
        t
    );
  }

  function cleanOutput(text) {
    return (
      text
        // remove markdown headers like ###, ##, #
        .replace(/#+\s*/g, "")

        // remove horizontal rules like --- or ***
        .replace(/[-*]{3,}/g, "")

        // remove bold/italic markers *, **, ***
        .replace(/\*+/g, "")

        .trim()
    );
  }

  async function callLLM(prompt) {
    const res = await fetch("https://ta2-api.vercel.app/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    return data.choices[0].message.content;
  }

  // =========================
  // Generate
  // =========================

  document.getElementById("generate").onclick = async () => {
    const rubric = rubricBox.value.trim();
    if (!rubric) return alert("Paste a rubric first!");

    const submission = latestSubmissionText;

    if (!submission) {
      document.getElementById("output").innerText =
        "No readable submission detected yet. Scroll or open the document preview.";
      return;
    }

    const toneMap = ["encouraging", "neutral", "critical"];
    const lengthMap = ["short", "medium", "long"];

    const tone = toneMap[document.getElementById("toneSlider").value];
    const feedback_length =
      lengthMap[document.getElementById("lengthSlider").value];

    const prompt = `
      You are a strict teaching assistant who must follow the rubric EXACTLY.

      Rubric (total points only from these items):
      ${rubric}

      Student submission:
      ${submission}

      Tone instructions:
      If tone is encouraging:
      - Be supportive and motivating
      - Highlight strengths before weaknesses

      If tone is neutral:
      - Be professional and factual

      If tone is critical:
      - Be strict and blunt, focusing on problems

      Tone selected: ${tone}

      feedback_length instructions:
      If feedback_length is short:
      - Write exactly 2 short sentences.

      If feedback_length is medium:
      - Write exactly 4 to 5 short sentences.

      If feedback_length is long:
      - Write exactly 8 to 10 sentences.

      feedback_length selected: ${feedback_length}

      Rules:
      - Only award points explicitly listed in the rubric
      - Do NOT assume a 10-point scale unless stated
      - Show each rubric item with points earned
      - Then give a short feedback paragraph with no em dashes
      - Do not exceed the specified sentence count.

      Output format:

      ### Grade (X/Y)
      (list rubric item): (corresponding score) X / Y
      (do not include feedback in grade section)

      ### Feedback
      (short paragraph, no blank lines, no em dashes)
      `;

    document.getElementById("output").textContent = "Generating...";

    try {
      const feedback = await callLLM(prompt);

      let processed = feedback;

      //limitSentences
      if (feedback_length === "short") {
        processed = limitFeedbackOnly(feedback, 2);
      }

      if (feedback_length === "medium") {
        processed = limitFeedbackOnly(feedback, 4);
      }

      if (feedback_length === "long") {
        processed = limitFeedbackOnly(feedback, 8);
      }

      document.getElementById("output").textContent = cleanOutput(
        forceLists(processed)
      );
    } catch (e) {
      console.error(e);
      document.getElementById("output").textContent =
        "LLM error — check console.";
    }
  };
})();
