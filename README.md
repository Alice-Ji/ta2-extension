# TA² — Your Teaching Co-Pilot   

**An LLM-powered grading assistant for overworked TAs, grad instructors, and adjuncts.**  
*Built with AI, for grading with AI, where user friction and rapid prototyping co-evolved the product.*

---

## What It Is

TA² is a browser extension that lives inside **Canvas SpeedGrader** and helps instructors generate fast, customized, tone-appropriate feedback using an LLM.

It:

- Reads student submissions directly in SpeedGrader *(never stored)*
- Lets you input a rubric once per assignment
- Generates a suggested **grade + feedback comment**
- Includes **one-click copy** to paste into Canvas

Think:  
> *“Clippy, but for desperate grad students and adjuncts grading 120 papers.”*

### Demo

![TA² Demo](https://raw.githubusercontent.com/Alice-Ji/ta2-extension/main/ta2_v3demo.gif)

---

## MVP Features

- Floating overlay inside Canvas SpeedGrader  
- Rubric input (persists across refreshes)  
- LLM-generated feedback + grade  
- Tone & length sliders  
- Submission preview (first/last characters for scrape verification)  
- Copy-to-clipboard output  

---

## Tech Stack

**Extension**
- Chrome (Manifest v3)  
- JavaScript (TypeScript optional)

**UI**
- HTML/CSS

**LLM**
- OpenRouter (default: Mistral)

**Dev**
- VSCode  
- GitHub  

> Built using an AI-first workflow with ChatGPT Codex and Claude Code to prioritize rapid prototyping, UX flow, and iteration speed over premature architectural polish.

---

## Getting Started

1. Clone this repo  
2. Open Chrome → `chrome://extensions`  
3. Enable **Developer Mode**  
4. Click **Load unpacked** and select the extension folder  
5. Open Canvas SpeedGrader and start grading faster

---

## Notes

- No student data is stored  
- All processing happens via API calls on demand  
- Built as a rapid MVP with an AI-first workflow — feedback welcome!
