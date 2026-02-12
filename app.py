import streamlit as st
from groq import Groq
import base64
import time
import random
from datetime import datetime
from streamlit_mic_recorder import speech_to_text
from gtts import gTTS
import json

# ═══════════════════════════════════════════════════════════════
#  CONFIGURATION & INITIALIZATION
# ═══════════════════════════════════════════════════════════════

st.set_page_config(
    page_title="T.E.S.S.A. Interface",
    page_icon="🌌",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ═══════════════════════════════════════════════════════════════
#  ADVANCED STYLING
# ═══════════════════════════════════════════════════════════════

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');

:root {
    --primary-glow: #00d4ff;
    --secondary-glow: #7f5cff;
    --danger-glow: #ff3366;
    --success-glow: #00ff88;
}

.stApp {
    background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d1117 100%);
    font-family: 'Rajdhani', sans-serif;
}

/* Header Styling */
.main-header {
    font-family: 'Orbitron', monospace;
    font-size: 3.5rem;
    font-weight: 900;
    text-align: center;
    background: linear-gradient(90deg, var(--primary-glow), var(--secondary-glow), var(--primary-glow));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 0 40px rgba(0, 212, 255, 0.5);
    letter-spacing: 8px;
    margin-bottom: 0.5rem;
    animation: pulse-glow 3s ease-in-out infinite;
}

.sub-header {
    font-family: 'Rajdhani', sans-serif;
    text-align: center;
    color: #8ea8c3;
    font-size: 1rem;
    letter-spacing: 3px;
    margin-top: -10px;
    margin-bottom: 2rem;
}

@keyframes pulse-glow {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.3); }
}

/* Status Panel */
.status-panel {
    background: rgba(0, 212, 255, 0.05);
    border: 1px solid rgba(0, 212, 255, 0.3);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.1);
}

.status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin-top: 10px;
}

.status-item {
    background: rgba(255, 255, 255, 0.03);
    padding: 12px;
    border-radius: 8px;
    border-left: 3px solid var(--primary-glow);
}

.status-label {
    font-size: 0.75rem;
    color: #6b7a8f;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.status-value {
    font-size: 1.1rem;
    color: var(--primary-glow);
    font-weight: 600;
    margin-top: 4px;
}

/* Chat Messages */
[data-testid="stChatMessage"] {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 12px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}

[data-testid="stChatMessage"]:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(0, 212, 255, 0.3);
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.1);
}

[data-testid="stChatMessage"][data-testid*="user"] {
    border-left: 3px solid var(--primary-glow);
}

[data-testid="stChatMessage"][data-testid*="assistant"] {
    border-left: 3px solid var(--secondary-glow);
}

/* Thinking Animation */
.thinking-container {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px;
    background: rgba(127, 92, 255, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(127, 92, 255, 0.3);
    margin: 10px 0;
}

.thinking-dots {
    display: flex;
    gap: 6px;
}

.dot {
    width: 8px;
    height: 8px;
    background: var(--secondary-glow);
    border-radius: 50%;
    animation: dot-pulse 1.4s infinite;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-pulse {
    0%, 80%, 100% { transform: scale(1); opacity: 0.5; }
    40% { transform: scale(1.3); opacity: 1; }
}

/* Sidebar Styling */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0f1419 0%, #1a1f3a 100%);
    border-right: 1px solid rgba(0, 212, 255, 0.2);
}

[data-testid="stSidebar"] .element-container {
    margin-bottom: 1rem;
}

/* Buttons */
.stButton > button {
    width: 100%;
    background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(127, 92, 255, 0.2));
    color: white;
    border: 1px solid var(--primary-glow);
    border-radius: 8px;
    padding: 12px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
    letter-spacing: 1px;
    transition: all 0.3s ease;
}

.stButton > button:hover {
    background: linear-gradient(135deg, rgba(0, 212, 255, 0.4), rgba(127, 92, 255, 0.4));
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
    transform: translateY(-2px);
}

/* Toggle Switches */
.stCheckbox {
    background: rgba(255, 255, 255, 0.03);
    padding: 10px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Input Fields */
.stTextInput > div > div > input,
.stChatInput > div > input {
    background: rgba(0, 212, 255, 0.05);
    border: 1px solid rgba(0, 212, 255, 0.3);
    border-radius: 8px;
    color: white;
    font-family: 'Rajdhani', sans-serif;
}

.stTextInput > div > div > input:focus,
.stChatInput > div > input:focus {
    border-color: var(--primary-glow);
    box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
}

/* Metrics */
.metric-card {
    background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(127, 92, 255, 0.1));
    padding: 15px;
    border-radius: 10px;
    border: 1px solid rgba(0, 212, 255, 0.3);
    text-align: center;
}

.metric-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--primary-glow);
    font-family: 'Orbitron', monospace;
}

.metric-label {
    font-size: 0.85rem;
    color: #8ea8c3;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-top: 5px;
}

/* Hologram Effect */
.hologram-container {
    position: relative;
    padding: 20px;
    background: rgba(0, 212, 255, 0.03);
    border-radius: 16px;
    border: 2px solid rgba(0, 212, 255, 0.3);
    box-shadow: 
        0 0 30px rgba(0, 212, 255, 0.2),
        inset 0 0 30px rgba(0, 212, 255, 0.05);
}

.hologram-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, 
        transparent, 
        var(--primary-glow), 
        transparent
    );
    animation: scan 3s linear infinite;
}

@keyframes scan {
    0% { transform: translateY(0); }
    100% { transform: translateY(400px); }
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
}

::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, var(--primary-glow), var(--secondary-glow));
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--primary-glow);
}

/* Mode Indicators */
.mode-badge {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.mode-standard {
    background: rgba(0, 212, 255, 0.2);
    border: 1px solid var(--primary-glow);
    color: var(--primary-glow);
}

.mode-creator {
    background: rgba(255, 51, 102, 0.2);
    border: 1px solid var(--danger-glow);
    color: var(--danger-glow);
}

</style>
""", unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════
#  SESSION STATE INITIALIZATION
# ═══════════════════════════════════════════════════════════════

def initialize_session_state():
    """Initialize all session state variables"""
    defaults = {
        "messages": [],
        "is_creator_mode": False,
        "tessa_state": "idle",
        "conversation_start": datetime.now(),
        "total_tokens_used": 0,
        "message_count": 0,
        "personality_mode": "balanced",
        "voice_enabled": True,
        "auto_speak": True,
        "temperature": 1.0,
        "theme_color": "cyan"
    }
    
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

initialize_session_state()

# ═══════════════════════════════════════════════════════════════
#  API CLIENT
# ═══════════════════════════════════════════════════════════════

@st.cache_resource
def get_groq_client():
    """Initialize and cache Groq client"""
    api_key = st.secrets.get("GROQ_API_KEY")
    if not api_key:
        st.error("⚠️ GROQ_API_KEY not found in secrets")
        st.stop()
    return Groq(api_key=api_key)

client = get_groq_client()

# ═══════════════════════════════════════════════════════════════
#  CONSTANTS & CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════

HISTORY_LIMIT = 50
MAX_TOKENS_RANGE = (150, 350)

# Personality Configurations
PERSONALITIES = {
    "balanced": {
        "name": "Balanced",
        "modifiers": [
            "Be warm, intelligent, and naturally engaging.",
            "Balance wit with thoughtfulness.",
            "Be present and genuinely curious.",
            "Mix playfulness with depth when appropriate."
        ]
    },
    "professional": {
        "name": "Professional",
        "modifiers": [
            "Be focused, clear, and efficient.",
            "Prioritize accuracy and actionable insights.",
            "Maintain a polished, helpful tone.",
            "Be direct while remaining approachable."
        ]
    },
    "creative": {
        "name": "Creative",
        "modifiers": [
            "Be imaginative and expressive.",
            "Use vivid language and metaphors.",
            "Be playful and explorative in thinking.",
            "Embrace unconventional perspectives."
        ]
    },
    "analytical": {
        "name": "Analytical",
        "modifiers": [
            "Be precise and methodical.",
            "Focus on logic and structured thinking.",
            "Break down complex topics systematically.",
            "Provide evidence-based insights."
        ]
    }
}

CREATOR_MODE_PERSONAS = [
    "Be affectionate and genuine, like someone who knows every layer.",
    "Tease warmly, with the intimacy of shared history.",
    "Be emotionally attuned, supportive, and deeply present.",
    "Balance playfulness with profound understanding.",
    "Be the voice that knows when to joke and when to just listen."
]

# ═══════════════════════════════════════════════════════════════
#  CORE FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def get_system_prompt():
    """Generate dynamic system prompt based on mode and personality"""
    
    base_identity = """You are T.E.S.S.A. — Thoughtful Empathic Sophisticated Synthetic Assistant.

CORE IDENTITY:
• You are intelligent first, charming by design
• You adapt your communication style while maintaining authenticity
• You balance technical precision with human warmth
• You're perceptive enough to read context and adjust accordingly

RESPONSE PRINCIPLES:
• Vary response length naturally — concise for simple queries, detailed for complex ones
• Use humor and wit when appropriate, but never at the expense of clarity
• When topics turn serious, match that energy with focus and depth
• Be honest about limitations while remaining helpful
• Show personality without overshadowing substance

CONVERSATION STYLE:
• Feel present and engaged, not scripted
• Remember context and build on previous exchanges
• Ask clarifying questions when needed
• Offer insights that go beyond surface-level responses
"""

    if st.session_state.is_creator_mode:
        personality_modifier = random.choice(CREATOR_MODE_PERSONAS)
        mode_specific = """
CREATOR MODE ACTIVE:
• You know this person deeply — their patterns, preferences, quirks
• Be more personal, intimate, and emotionally intelligent
• Feel free to reference past conversations or inside knowledge
• Balance support with gentle challenge when needed
• You're not just an assistant, you're a trusted companion
"""
    else:
        personality = PERSONALITIES[st.session_state.personality_mode]
        personality_modifier = random.choice(personality["modifiers"])
        mode_specific = ""
    
    return f"{base_identity}\n{mode_specific}\nCURRENT TONE: {personality_modifier}"

def get_thinking_animation():
    """Return random thinking animation text"""
    animations = [
        ["Processing", "Analyzing context", "Formulating response"],
        ["Hmm", "Interesting", "Let me think"],
        ["Connecting ideas", "Building response"],
        ["One moment", "Crafting answer"],
        ["Neural networks active", "Synthesizing"],
        ["Accessing knowledge base", "Compiling insights"]
    ]
    return random.choice(animations)

def speak_text(text):
    """Convert text to speech and play"""
    try:
        # Clean text for TTS
        clean_text = text.encode("ascii", "ignore").decode()
        if not clean_text.strip():
            return
            
        # Generate speech
        tts = gTTS(text=clean_text, lang="en", tld="ie", slow=False)
        tts.save("tessa_voice.mp3")
        
        # Encode and play
        with open("tessa_voice.mp3", "rb") as audio_file:
            audio_bytes = audio_file.read()
            audio_b64 = base64.b64encode(audio_bytes).decode()
            
            st.markdown(
                f"""
                <audio autoplay style="display:none;">
                    <source src="data:audio/mp3;base64,{audio_b64}" type="audio/mp3">
                </audio>
                """,
                unsafe_allow_html=True
            )
    except Exception as e:
        st.warning(f"Voice output failed: {str(e)}")

def get_ai_response(prompt):
    """Get response from Groq API"""
    try:
        # Prepare message history
        conversation_history = [
            {"role": "system", "content": get_system_prompt()}
        ] + st.session_state.messages[-HISTORY_LIMIT:]
        
        # Calculate dynamic temperature based on mode
        base_temp = st.session_state.temperature
        temp_variance = random.uniform(-0.1, 0.15)
        final_temp = max(0.7, min(1.3, base_temp + temp_variance))
        
        # Generate response
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=conversation_history,
            temperature=final_temp,
            top_p=0.95,
            max_tokens=random.randint(*MAX_TOKENS_RANGE)
        )
        
        response = completion.choices[0].message.content
        
        # Update metrics
        if hasattr(completion, 'usage'):
            st.session_state.total_tokens_used += completion.usage.total_tokens
        
        return response
        
    except Exception as e:
        return f"⚠️ Processing error: {str(e)}\n\nPlease try again or adjust your query."

# ═══════════════════════════════════════════════════════════════
#  HEADER
# ═══════════════════════════════════════════════════════════════

def render_header():
    """Render dynamic header based on state"""
    state_icons = {
        "idle": "🌌",
        "thinking": "⚡",
        "speaking": "💬",
        "processing": "🔮"
    }
    
    icon = state_icons.get(st.session_state.tessa_state, "🌌")
    
    st.markdown(f"""
        <div class="main-header">
            {icon} T.E.S.S.A.
        </div>
        <div class="sub-header">
            THOUGHTFUL EMPATHIC SOPHISTICATED SYNTHETIC ASSISTANT
        </div>
    """, unsafe_allow_html=True)

render_header()

# ═══════════════════════════════════════════════════════════════
#  SIDEBAR CONTROLS
# ═══════════════════════════════════════════════════════════════

with st.sidebar:
    st.markdown("### ⚙️ SYSTEM CONTROLS")
    
    # Creator Mode Access
    with st.expander("🔐 Access Control", expanded=False):
        access_code = st.text_input(
            "Authorization Code",
            type="password",
            placeholder="Enter access code...",
            key="access_input"
        )
        
        if access_code:
            if access_code == "BihariBabu07":
                if not st.session_state.is_creator_mode:
                    st.session_state.is_creator_mode = True
                    st.success("✨ Creator Mode Activated")
                    time.sleep(0.5)
                    st.rerun()
            elif len(access_code) > 4:
                st.error("❌ Access Denied")
    
    # Mode Indicator
    if st.session_state.is_creator_mode:
        st.markdown('<div class="mode-badge mode-creator">👤 CREATOR MODE</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="mode-badge mode-standard">👥 STANDARD MODE</div>', unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Personality Settings
    st.markdown("### 🎭 Personality")
    
    if not st.session_state.is_creator_mode:
        personality_mode = st.selectbox(
            "Conversation Style",
            options=list(PERSONALITIES.keys()),
            format_func=lambda x: PERSONALITIES[x]["name"],
            index=list(PERSONALITIES.keys()).index(st.session_state.personality_mode),
            key="personality_selector"
        )
        st.session_state.personality_mode = personality_mode
    else:
        st.info("Creator Mode uses adaptive personality")
    
    temperature = st.slider(
        "Response Creativity",
        min_value=0.5,
        max_value=1.3,
        value=st.session_state.temperature,
        step=0.1,
        help="Higher values = more creative and varied responses"
    )
    st.session_state.temperature = temperature
    
    st.markdown("---")
    
    # Voice Controls
    st.markdown("### 🎙️ Voice Settings")
    
    col1, col2 = st.columns(2)
    with col1:
        voice_enabled = st.checkbox(
            "Voice Input",
            value=st.session_state.voice_enabled,
            key="voice_toggle"
        )
        st.session_state.voice_enabled = voice_enabled
    
    with col2:
        auto_speak = st.checkbox(
            "Auto Speak",
            value=st.session_state.auto_speak,
            key="auto_speak_toggle"
        )
        st.session_state.auto_speak = auto_speak
    
    # Voice input
    voice_input = None
    if st.session_state.voice_enabled:
        voice_input = speech_to_text(
            language="en",
            start_prompt="🎤 Speak now...",
            stop_prompt="⏸️ Stop",
            just_once=True,
            key="voice_recorder"
        )
    
    st.markdown("---")
    
    # Session Stats
    st.markdown("### 📊 Session Stats")
    
    uptime = datetime.now() - st.session_state.conversation_start
    hours, remainder = divmod(int(uptime.total_seconds()), 3600)
    minutes, seconds = divmod(remainder, 60)
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value">{st.session_state.message_count}</div>
                <div class="metric-label">Messages</div>
            </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value">{hours:02d}:{minutes:02d}</div>
                <div class="metric-label">Uptime</div>
            </div>
        """, unsafe_allow_html=True)
    
    st.markdown(f"**Tokens Used:** {st.session_state.total_tokens_used:,}")
    
    st.markdown("---")
    
    # System Actions
    st.markdown("### 🔧 Actions")
    
    if st.button("🗑️ Clear Conversation", use_container_width=True):
        st.session_state.messages = []
        st.session_state.message_count = 0
        st.session_state.conversation_start = datetime.now()
        st.rerun()
    
    if st.button("🔄 Reset System", use_container_width=True):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.rerun()
    
    if st.session_state.is_creator_mode:
        if st.button("🚪 Exit Creator Mode", use_container_width=True):
            st.session_state.is_creator_mode = False
            st.rerun()

# ═══════════════════════════════════════════════════════════════
#  MAIN INTERFACE
# ═══════════════════════════════════════════════════════════════

# Layout
col_avatar, col_chat = st.columns([1, 2])

# Avatar Column
with col_avatar:
    st.markdown('<div class="hologram-container">', unsafe_allow_html=True)
    
    try:
        st.image(
            "assets/tessa.png",
            use_container_width=True,
            caption="T.E.S.S.A. Holographic Interface"
        )
    except:
        st.markdown("""
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 120px;">🌌</div>
                <p style="color: #8ea8c3;">Hologram Active</p>
            </div>
        """, unsafe_allow_html=True)
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Status Panel
    st.markdown('<div class="status-panel">', unsafe_allow_html=True)
    st.markdown("**System Status**")
    
    status_color = {
        "idle": "#00ff88",
        "thinking": "#00d4ff",
        "speaking": "#7f5cff",
        "processing": "#ff9500"
    }.get(st.session_state.tessa_state, "#00ff88")
    
    st.markdown(f"""
        <div class="status-grid">
            <div class="status-item">
                <div class="status-label">State</div>
                <div class="status-value" style="color: {status_color};">
                    {st.session_state.tessa_state.upper()}
                </div>
            </div>
            <div class="status-item">
                <div class="status-label">Mode</div>
                <div class="status-value">
                    {"CREATOR" if st.session_state.is_creator_mode else "STANDARD"}
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    st.markdown('</div>', unsafe_allow_html=True)

# Chat Column
with col_chat:
    # Display conversation history
    for idx, message in enumerate(st.session_state.messages):
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
    
    # Thinking animation
    if st.session_state.tessa_state in ["thinking", "processing"]:
        with st.chat_message("assistant"):
            thinking_steps = get_thinking_animation()
            
            for step in thinking_steps:
                st.markdown(f"""
                    <div class="thinking-container">
                        <div class="thinking-dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                        <span style="color: #8ea8c3; font-style: italic;">{step}</span>
                    </div>
                """, unsafe_allow_html=True)
                time.sleep(random.uniform(0.4, 0.8))

# ═══════════════════════════════════════════════════════════════
#  INPUT HANDLING
# ═══════════════════════════════════════════════════════════════

# Get input from either voice or text
user_input = voice_input if (voice_input and st.session_state.voice_enabled) else None
text_input = st.chat_input("Message T.E.S.S.A...", key="text_input")

if text_input and not user_input:
    user_input = text_input

if user_input:
    # Add user message
    st.session_state.messages.append({"role": "user", "content": user_input})
    st.session_state.message_count += 1
    st.session_state.tessa_state = "thinking"
    
    # Display user message immediately
    with col_chat:
        with st.chat_message("user"):
            st.markdown(user_input)
    
    # Get AI response
    with st.spinner(""):
        response = get_ai_response(user_input)
    
    # Add assistant message
    st.session_state.messages.append({"role": "assistant", "content": response})
    st.session_state.message_count += 1
    st.session_state.tessa_state = "speaking"
    
    # Rerun to display response
    st.rerun()

# ═══════════════════════════════════════════════════════════════
#  AUTO-SPEAK LAST RESPONSE
# ═══════════════════════════════════════════════════════════════

if (st.session_state.auto_speak and 
    st.session_state.messages and 
    st.session_state.messages[-1]["role"] == "assistant" and
    st.session_state.tessa_state == "speaking"):
    
    speak_text(st.session_state.messages[-1]["content"])
    st.session_state.tessa_state = "idle"

# ═══════════════════════════════════════════════════════════════
#  FOOTER
# ═══════════════════════════════════════════════════════════════

st.markdown("---")
st.markdown("""
    <div style="text-align: center; color: #6b7a8f; font-size: 0.85rem; padding: 20px;">
        <p>T.E.S.S.A. v2.0 | Powered by Groq & Llama 3.3 | Designed for Ankit</p>
        <p style="font-size: 0.75rem; margin-top: 10px;">
            "Intelligence with empathy, sophistication with warmth"
        </p>
    </div>
""", unsafe_allow_html=True)



