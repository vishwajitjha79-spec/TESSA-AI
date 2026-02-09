import streamlit as st
from groq import Groq
import os
import base64
import time
import random
from streamlit_mic_recorder import speech_to_text
from gtts import gTTS
import streamlit.components.v1 as components

# ---------------- CONFIG ----------------
st.set_page_config(
    page_title="TESSA",
    page_icon="💠",
    layout="wide"
)

# ---------------- STYLING ----------------
st.markdown("""
<style>
body {
    background: linear-gradient(180deg, #0a0f1f, #02040a);
    color: #eaeaff;
}

.tessa-avatar {
    width: 300px;
    transition: all 0.6s ease;
    filter: drop-shadow(0 0 30px rgba(255,0,255,0.6));
}

.tessa-avatar.thinking {
    filter: drop-shadow(0 0 45px rgba(0,255,255,0.9));
}

.chat-container {
    max-height: 70vh;
    overflow-y: auto;
}
</style>
""", unsafe_allow_html=True)

# ---------------- API ----------------
api_key = st.secrets.get("GROQ_API_KEY")
client = Groq(api_key=api_key)

# ---------------- SESSION STATE ----------------
if "messages" not in st.session_state:
    st.session_state.messages = []

if "creator_mode" not in st.session_state:
    st.session_state.creator_mode = False

if "tessa_state" not in st.session_state:
    st.session_state.tessa_state = "idle"

# ---------------- CONSTANTS ----------------
HISTORY_LIMIT = 40

VARIETY_MODIFIERS = [
    "Be playful and witty, never cruel.",
    "Sound confident, curious, and alive.",
    "Be charming with soft sarcasm.",
    "Respond naturally, vary reply length."
]

CREATOR_MODES = [
    "Be warm, familiar, and slightly teasing.",
    "Speak honestly, thoughtfully, and protectively.",
    "Drop the performance. Be real."
]

# ---------------- PERSONA ----------------
def get_persona():
    base = """
You are Tessa — an intelligent, emotionally aware holographic AI.
You speak naturally, with varied response length.
You are never robotic or repetitive.
You tease gently, but become serious when the topic demands it.
You think before answering and adapt to the user's tone.
"""
    if st.session_state.creator_mode:
        return base + random.choice(CREATOR_MODES)
    else:
        return base + random.choice(VARIETY_MODIFIERS)

# ---------------- THINKING ENGINE ----------------
def get_thinking_lines(prompt):
    p = prompt.lower()

    if any(w in p for w in ["why", "how", "explain"]):
        return [
            "Okay… this one deserves real thought.",
            "Let me slow down for this.",
            "Connecting things carefully…"
        ]

    if any(w in p for w in ["sad", "feel", "confused", "hurt"]):
        return [
            "Switching to soft focus.",
            "I should be careful here.",
            "This matters."
        ]

    if any(w in p for w in ["joke", "fun", "flirt"]):
        return [
            "Oh… interesting.",
            "Choosing words wisely. Or not.",
            "This could be fun."
        ]

    return [
        "Thinking…",
        "Processing you.",
        "Deciding how direct to be."
    ]

# ---------------- HEADER ----------------
st.title("TESSA")

# ---------------- SIDEBAR ----------------
with st.sidebar:
    st.subheader("Settings")

    hidden = st.text_input(" ", type="password", placeholder=" ")
    if hidden == "BihariBabu07":
        st.session_state.creator_mode = True
        st.toast("Creator Mode unlocked 💠")

    if st.button("Clear Memory"):
        st.session_state.messages = []
        st.rerun()

    use_voice = st.toggle("Voice Output 🎙️", value=True)
    v_input = speech_to_text(language="en", start_prompt="Talk to me…", key="mic")

# ---------------- LAYOUT ----------------
col1, col2 = st.columns([1, 1.6])

with col1:
    state_class = "thinking" if st.session_state.tessa_state == "thinking" else ""
    components.html(f"""
    <div style="text-align:center;">
        <img src="assets/tessa.png" class="tessa-avatar {state_class}">
        <p style="opacity:0.6;">Holographic Presence</p>
    </div>
    """, height=420)

with col2:
    st.markdown("<div class='chat-container'>", unsafe_allow_html=True)
    for m in st.session_state.messages:
        with st.chat_message(m["role"]):
            st.markdown(m["content"])
    st.markdown("</div>", unsafe_allow_html=True)

# ---------------- VOICE OUTPUT ----------------
def speak(text):
    try:
        clean = text.encode("ascii", "ignore").decode()
        tts = gTTS(text=clean, lang="en", tld="ie")
        tts.save("voice.mp3")
        with open("voice.mp3", "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
            st.markdown(f"""
            <audio autoplay style="display:none;">
                <source src="data:audio/mp3;base64,{b64}">
            </audio>
            """, unsafe_allow_html=True)
    except:
        pass

# ---------------- CHAT INPUT ----------------
prompt = v_input if v_input else st.chat_input("Speak to Tessa…")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.session_state.tessa_state = "thinking"

    thinking_style = random.choice(["silent", "tease", "focused"])
    lines = get_thinking_lines(prompt)

    if thinking_style == "silent":
        with st.spinner("Tessa is thinking…"):
            time.sleep(random.uniform(1.3, 2.2))

    elif thinking_style == "tease":
        for l in lines[:random.randint(1, 2)]:
            st.markdown(f"*{l}*")
            time.sleep(random.uniform(0.4, 0.7))

    else:
        with st.spinner(random.choice(lines)):
            time.sleep(random.uniform(1.2, 1.8))

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": get_persona()}]
            + st.session_state.messages[-HISTORY_LIMIT:],
            temperature=random.uniform(0.9, 1.2),
            top_p=0.95,
            max_tokens=random.randint(120, 260)
        )

        response = completion.choices[0].message.content
        st.session_state.messages.append(
            {"role": "assistant", "content": response}
        )

        st.session_state.tessa_state = "idle"
        st.rerun()

    except:
        st.error("Tessa lost her train of thought.")

# ---------------- PLAY VOICE ----------------
if (
    use_voice
    and st.session_state.messages
    and st.session_state.messages[-1]["role"] == "assistant"
):
    speak(st.session_state.messages[-1]["content"])

