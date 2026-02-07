# Ai Caption Generator
An AI-powered web application that generates engaging, context-aware social media captions from images using multimodal large language models.

Built using a two-stage Gemini Vision → text → caption pipeline for improved contextual accuracy.

This project focuses on **accuracy, flexibility, and clean architecture**, making caption generation both fast and customizable.

⚠️ **Project Status:** Working Prototype (Active Development)

---

## 🚀 Key Features
- Image-based caption generation using AI
- Two-step AI pipeline for better context accuracy
- Multiple caption styles:
  - Creative
  - Professional
  - Casual
  - Funny
  - Inspirational
  - Descriptive
- Adjustable caption length (Short / Medium / Long)
- Optional emoji and hashtag generation
- Drag-and-drop image upload
- Caption history stored locally in the browser
- Modern, responsive UI

---

## 🧠 How the System Works

The application uses a **two-pass AI approach** instead of directly generating captions from images:

1. **Image → Description**
   - The uploaded image is first analyzed by a multimodal AI model.
   - A neutral, objective description is generated (objects, actions, mood, environment).

2. **Description → Caption**
   - The description is then converted into a styled social media caption.
   - User-selected options (style, length, emojis, hashtags) are applied at this stage.

This separation improves:
- Context preservation
- Caption relevance
- Control over tone and structure

---

## 🛠 Tech Stack

### Frontend
- HTML
- CSS (custom animations & responsive design)
- Vanilla JavaScript

### Backend
- Python
- Flask
- Google Gemini Multimodal Models

### Architecture
- REST-based client–server communication
- Stateless API design
- Client-side local storage for history

---

## 🧪 Current Limitations
- No authentication or user accounts
- No database (history is stored in browser local storage)
- Not deployed yet

---

## 🧩 Planned Enhancements
- User authentication with free and paid tiers
- Advanced mode with secondary AI model
- Multi-language caption support (including Indian languages)
- Database-backed caption history
- Cloud deployment
- Admin controls and usage limits

---

## 📜 License
This project is licensed under the GNU AGPLv3 license.
You are free to view and modify the code for learning purposes, but commercial use requires compliance with the license terms.

---

## 👥 Contributors

- **Saumya Tagore** – Backend architecture, AI pipeline, Gemini integration, JavaScript interactions  
- **Shyamasish Bhattacharjee** – Frontend UI/UX design, JavaScript interactions & animations 
- **Anwesha Khan** – Project Documentation    
