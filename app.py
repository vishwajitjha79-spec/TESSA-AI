import streamlit as st
import time
import random
from openai import OpenAI

# ---------------- CONFIG ----------------
st.set_page_config(
    page_title="TESSA",
    page_icon="✨",
    layout="centered"
)

client = OpenAI(api_key=st.secrets["OPENAI_API_KEY"])

# ---------------- SESSION STATE ----------------
if "messages" not in st.session_state:
    st.session_state.messages = []

if "tessa_state" not in st.session_state:
    st.session_state.tessa_state = "idle"

if "creator_mode" not in st.session_state:
    st.session_state.creator_mode = False


# ---------------- CSS ----------------
st.markdown("""
<style>
body {
    background: radial-gradient(circle at top, #0b0f1a, #020409);
    color: #eaeaff;
}

.chat-container {
    max-height: 70vh;
    overflow-y: auto;
    scroll-behavior: smooth;
}

.tessa-avatar {
    width: 260px;
    display: block;
    margin: auto;
    filter: drop-shadow(0 0 30px rgba(255, 0, 180, 0.6));
    transition: all 0.4s ease;
}

.tessa-avatar.thinking {
    filter: drop-shadow(0 0 45px rgba(0, 255, 255, 0.9));
}

.thinking-text {
    text-align: center;
    opacity: 0.75;
    font-style: italic;
    margin-top: 6px;
}

.user {
    background: linear-gradient(135deg, #2a2f45, #1b1f33);
    padding: 12px;
    border-radius: 12px;
    margin: 8px 0;
}

.tessa {
    background: linear-gradient(135deg, #4b0055, #24002a);
    padding: 12px;
    border-radius: 12px;
    margin: 8px 0;
}
</style>
""", unsafe_allow_html=True)


# ---------------- AVATAR ----------------
state_class = "thinking" if st.session_state.tessa_state == "thinking" else ""
st.markdown(f"""
<img src="assets/tessa.png" class="tessa-avatar {state_class}">
""", unsafe_allow_html=True)


# ---------------- THINKING ENGINE ----------------
def get_thinking_lines(prompt):
    p = prompt.lower()

    if any(w in p for w in ["why", "how", "explain"]):
        return [
            "Alright… this needs actual thought.",
            "Let me slow down for this.",
            "Pulling threads together…"
        ]

    if any(w in p for w in ["sad", "feel", "lost", "confused"]):
        return [
            "Okay… emotional weight detected.",
            "Switching to gentle mode.",
            "I need to choose my words carefully."
        ]

    if any(w in p for w in ["joke", "fun", "flirt"]):
        return [
            "Oh? We’re doing *that*?",
            "This could be dangerous.",
            "Let me behave… maybe."
        ]

    return [
        "Thinking…",
        "Processing you.",
        "Deciding how honest to be."
    ]


def perform_thinking(prompt):
    st.session_state.tessa_state = "thinking"
    style = random.choice(["silent", "tease", "focused"])
    lines = get_thinking_lines(prompt)

    if style == "silent":
        with st.spinner("Tessa is thinking…"):
            time.sleep(random.uniform(1.3, 2.2))

    elif style == "tease":
        for line in lines[:random.randint(1, 2)]:
            st.markdown(f"<div class='thinking-text'>{line}</div>", unsafe_allow_html=True)
            time.sleep(random.uniform(0.4, 0.7))

    else:
        with st.spinner(random.choice(lines)):
            time.sleep(random.uniform(1.1, 1.8))


# ---------------- CHAT HISTORY ----------------
st.markdown("<div class='chat-container'>", unsafe_allow_html=True)

for msg in st.session_state.messages:
    role_class = "user" if msg["role"] == "user" else "tessa"
    st.markdown(f"<div class='{role_class}'>{msg['content']}</div>", unsafe_allow_html=True)

st.markdown("</div>", unsafe_allow_html=True)


# ---------------- INPUT ----------------
prompt = st.chat_input("Talk to Tessa…")

# Hidden Creator Mode Trigger
if prompt and prompt.strip().lower() == "access heart":
    st.session_state.creator_mode = True
    st.session_state.messages.append({
        "role": "assistant",
        "content": "Heart access granted. Hello, Creator."
    })
    st.experimental_rerun()


if prompt and not st.session_state.creator_mode:
    st.session_state.messages.append({"role": "user", "content": prompt})

    perform_thinking(prompt)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are TESSA — a holographic AI assistant. "
                    "You are intelligent, warm, playful but not cruel. "
                    "You vary response length naturally. "
                    "You are serious when the topic is serious. "
                    "Never be robotic. Never over-sass."
                )
            }
        ] + st.session_state.messages
    )

    answer = response.choices[0].message.content

    # Slight human pacing
    time.sleep(random.uniform(0.3, 0.6))

    st.session_state.messages.append({"role": "assistant", "content": answer})
    st.session_state.tessa_state = "idle"

    st.experimental_rerun()


# ---------------- CREATOR MODE ----------------
if st.session_state.creator_mode:
    st.sidebar.title("💗 Tessa — Heart Mode")
    st.sidebar.write("You’re inside the core.")
    st.sidebar.write("Future settings, memory tuning, personality sliders go here.")


