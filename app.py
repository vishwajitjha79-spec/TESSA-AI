import streamlit as st
from groq import Groq
import base64
import time
import random
from streamlit_mic_recorder import speech_to_text
from gtts import gTTS

# ---------------- CONFIG ----------------
st.set_page_config(
    page_title="TESSA",
    page_icon="✨",
    layout="wide"
)

# ---------------- GLOBAL STYLE ----------------
st.markdown("""
<style>
.stApp {
    background: radial-gradient(circle at top, #0b1020, #02040a);
    color: #eaeaff;
}

[data-testid="stChatMessage"] {
    background: rgba(255,255,255,0.05);
    border-radius: 14px;
    padding: 10px;
    margin-bottom: 8px;
}

[data-testid="stChatMessage"] p {
    font-size: 0.95rem;
    line-height: 1.45;
}

h1 {
    letter-spacing: 4px;
    text-shadow: 0 0 18px #7f5cff;
}
</style>
""", unsafe_allow_html=True)

# ---------------- API ----------------
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
HISTORY_LIMIT = 40

VARIETY_MODIFIERS = [
    "Be warm, clever, and slightly playful.",
    "Be thoughtful and lightly teasing.",
    "Sound confident, curious, and engaging.",
    "Be relaxed, human, and observant."
]

ANKIT_MOODS = [
    "Be affectionate and playful, but grounded.",
    "Tease softly, like someone who knows him well.",
    "Be supportive, clever, and emotionally aware.",
    "Be calm, intimate, and honest."
]

# ---------------- PERSONA ----------------
def get_persona():
    base = """
You are Tessa — a Tempting, Empathic, Sassy, Smart Assistant.
You are intelligent first, charming second.
You tease lightly, never cruelly.
When topics turn serious, you respond with focus, depth, and emotional clarity.
Your replies vary naturally in length — sometimes concise, sometimes layered.
You feel present, alive, and thoughtful.
"""
    if st.session_state.is_ankit:
        return base + random.choice(ANKIT_MOODS)
    else:
        return base + random.choice(VARIETY_MODIFIERS)

# ---------------- HEADER ----------------
def get_header():
    return {
        "idle": "TESSA",
        "thinking": "TESSA — PROCESSING",
        "speaking": "TESSA — ENGAGED"
    }.get(st.session_state.tessa_state, "TESSA")

st.title(get_header())

# ---------------- SIDEBAR ----------------
with st.sidebar:
    st.subheader("Interface")

    # Hidden creator unlock (no labels, no buttons)
    secret = st.text_input(
    " ",
    type="password",
    placeholder="••••••••",
    label_visibility="collapsed"
)

if secret:
    if secret == "BihariBabu07":
        if not st.session_state.is_ankit:
            st.session_state.is_ankit = True
            st.success("❤️ Heart unlocked.")
            time.sleep(0.6)
            st.rerun()
    elif len(secret) > 4:
        st.warning("…that’s not it.")


    if st.button("Clear Memory"):
        st.session_state.messages = []
        st.rerun()

    use_voice = st.toggle("Voice 🎙️", value=True)
    v_input = speech_to_text(language="en", start_prompt="Talk to me…", key="mic")

# ---------------- LAYOUT ----------------
col1, col2 = st.columns([1, 1.6])

with col1:
    st.image(
        "assets/tessa.png",
        width=320,
        caption="Holographic Presence"
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

    thinking_fragments = [
        ["…", "listening"],
        ["hmm", "interesting"],
        ["focus mode"],
        ["connecting ideas"],
        ["choosing words carefully"]
    ]

    for t in random.choice(thinking_fragments):
        st.markdown(f"*{t}*")
        time.sleep(random.uniform(0.35, 0.7))

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": get_persona()}
            ] + st.session_state.messages[-HISTORY_LIMIT:],
            temperature=random.uniform(0.9, 1.15),
            top_p=0.95,
            max_tokens=random.randint(120, 260)
        )

        time.sleep(random.uniform(0.9, 1.6))

        response = completion.choices[0].message.content
        st.session_state.messages.append(
            {"role": "assistant", "content": response}
        )

        st.session_state.tessa_state = "speaking"
        st.rerun()

    except:
        st.error("Tessa paused. Try again.")

# ---------------- PLAY VOICE ----------------
if (
    use_voice
    and st.session_state.messages
    and st.session_state.messages[-1]["role"] == "assistant"
):
    speak(st.session_state.messages[-1]["content"])

# ---------------- AUTO SCROLL ----------------
st.markdown(
    "<script>window.scrollTo(0, document.body.scrollHeight);</script>",
    unsafe_allow_html=True
)



