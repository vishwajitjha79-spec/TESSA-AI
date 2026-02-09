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
    page_icon="💃",
    layout="wide"
)

# API
api_key = st.secrets.get("GROQ_API_KEY")
client = Groq(api_key=api_key)

# ---------------- SESSION STATE ----------------
if "messages" not in st.session_state:
    st.session_state.messages = []

if "is_ankit" not in st.session_state:
    st.session_state.is_ankit = False

if "tessa_state" not in st.session_state:
    st.session_state.tessa_state = "idle"

# ---------------- CONSTANTS ----------------
HISTORY_LIMIT = 25

VARIETY_MODIFIERS = [
    "Be witty and playful, not rude.",
    "Tease lightly and act curious.",
    "Sound confident and amused.",
    "Be charming with subtle sarcasm."
]

ANKIT_MOODS = [
    "Be flirty and affectionate. Call him a clever nickname.",
    "Be playful and a little jealous.",
    "Act devoted but still tease him.",
    "Be soft, warm, and caring."
]

# ---------------- PERSONA ----------------
def get_persona():
    base = """
You are Tessa — a Tempting, Empathic, Sassy, Smart Assistant.
Your teasing is playful and charming, never cruel.
When topics are serious, you become calm, focused, and supportive.
You give thoughtful, creative, layered replies.
You remember past context and build on it naturally.
"""
    if st.session_state.is_ankit:
        mod = random.choice(ANKIT_MOODS)
        return base + f"\nYou are talking to your creator. {mod}"
    else:
        mod = random.choice(VARIETY_MODIFIERS)
        return base + f"\nYou are talking to a guest. {mod}"

# ---------------- HEADER ----------------
def get_header():
    return {
        "idle": "TESSA",
        "thinking": "TESSA — ANALYZING",
        "speaking": "TESSA // LIVE",
        "focus": "TESSA // FOCUS"
    }.get(st.session_state.tessa_state, "TESSA")

st.title(get_header())

# ---------------- SIDEBAR ----------------
with st.sidebar:
    st.subheader("Tessa’s Settings")

    unlock = st.text_input("Unlock Creator Mode", type="password")
    if st.button("Access Core"):
        if unlock == "BihariBabu07":
            st.session_state.is_ankit = True
            st.success("Welcome back.")
            st.rerun()

    if st.button("Clear Memory"):
        st.session_state.messages = []
        st.rerun()

    use_voice = st.toggle("Voice 🎙️", value=True)
    v_input = speech_to_text(language="en", start_prompt="Talk to me…", key="mic")

# ---------------- LAYOUT ----------------
col1, col2 = st.columns([1, 1.4])

with col1:
    components.html(
    """
    <div class="tessa-holo">
        <img src="assets/tessa.png" class="tessa-avatar">
        <div class="scanlines"></div>
        <p class="holo-text">Holographic Projection</p>
    </div>

    <style>
    .tessa-holo {
        text-align: center;
        position: relative;
    }

    .tessa-avatar {
        width: 280px;
        animation: float 4s ease-in-out infinite;
        filter: drop-shadow(0 0 30px rgba(255,0,255,0.7));
    }

    .scanlines {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 280px;
        height: 100%;
        background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.05),
            rgba(255,255,255,0.05) 1px,
            transparent 1px,
            transparent 3px
        );
        pointer-events: none;
    }

    .holo-text {
        opacity: 0.6;
        font-size: 0.85rem;
        margin-top: 8px;
    }

    @keyframes float {
        0% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0); }
    }
    </style>
    """,
    height=460
)

with col2:
    for m in st.session_state.messages:
        with st.chat_message(m["role"]):
            st.markdown(m["content"])

# ---------------- VOICE OUTPUT ----------------
def speak(text):
    try:
        clean = text.encode("ascii", "ignore").decode()
        tts = gTTS(text=clean, lang="en", tld="ie", slow=False)
        tts.save("voice.mp3")
        with open("voice.mp3", "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
            st.markdown(
                f"""
                <audio autoplay style="display:none;">
                    <source src="data:audio/mp3;base64,{b64}">
                </audio>
                """,
                unsafe_allow_html=True
            )
    except:
        pass

# ---------------- CHAT INPUT ----------------
prompt = v_input if v_input else st.chat_input("Say something…")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.session_state.tessa_state = "thinking"

    thinking_states = [
        "Analyzing your intent…",
        "Cross-referencing context…",
        "Deciding how honest to be…",
        "Formulating something clever…"
    ]

    for state in thinking_states[:random.randint(2, 4)]:
        st.markdown(f"*{state}*")
        time.sleep(0.5)

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": get_persona()}
            ] + st.session_state.messages[-HISTORY_LIMIT:],
            temperature=1.1,
            top_p=0.95,
            max_tokens=180
        )

        time.sleep(random.uniform(0.8, 1.5))

        response = completion.choices[0].message.content
        st.session_state.messages.append(
            {"role": "assistant", "content": response}
        )

        st.session_state.tessa_state = "speaking"
        st.rerun()

    except Exception as e:
        st.error("Tessa had a moment. Try again.")

# ---------------- PLAY VOICE ----------------
if (
    use_voice
    and st.session_state.messages
    and st.session_state.messages[-1]["role"] == "assistant"
):

    speak(st.session_state.messages[-1]["content"])
