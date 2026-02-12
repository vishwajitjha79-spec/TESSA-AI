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
    color: #e8eef5;
}

/* Global text improvements */
p, span, div, label {
    color: #d4dce6;
}

h1, h2, h3, h4, h5, h6 {
    color: #ffffff;
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
    background: rgba(0, 212, 255, 0.08);
    border: 1px solid rgba(0, 212, 255, 0.4);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.15);
}

.status-panel > * {
    color: #e8eef5 !important;
}

.status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin-top: 10px;
}

.status-item {
    background: rgba(0, 212, 255, 0.05);
    padding: 12px;
    border-radius: 8px;
    border-left: 3px solid var(--primary-glow);
}

.status-label {
    font-size: 0.75rem;
    color: #99b3cc;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.status-value {
    font-size: 1.1rem;
    color: #00d4ff;
    font-weight: 600;
    margin-top: 4px;
}

/* Chat Messages */
[data-testid="stChatMessage"] {
    background: linear-gradient(135deg, rgba(10, 14, 39, 0.9), rgba(26, 31, 58, 0.85));
    border: 1px solid rgba(0, 212, 255, 0.25);
    border-radius: 16px;
    padding: 18px;
    margin-bottom: 14px;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    transition: all 0.3s ease;
}

[data-testid="stChatMessage"]:hover {
    background: linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(26, 31, 58, 0.9));
    border-color: rgba(0, 212, 255, 0.5);
    box-shadow: 0 0 25px rgba(0, 212, 255, 0.2);
    transform: translateY(-2px);
}

[data-testid="stChatMessage"][data-testid*="user"] {
    border-left: 4px solid var(--primary-glow);
    background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(10, 14, 39, 0.9));
}

[data-testid="stChatMessage"][data-testid*="assistant"] {
    border-left: 4px solid var(--secondary-glow);
    background: linear-gradient(135deg, rgba(127, 92, 255, 0.08), rgba(10, 14, 39, 0.9));
}

/* Chat Message Text */
[data-testid="stChatMessage"] p,
[data-testid="stChatMessage"] span,
[data-testid="stChatMessage"] div {
    color: #e8eef5 !important;
    line-height: 1.6;
}

[data-testid="stChatMessage"] strong {
    color: #ffffff !important;
}

[data-testid="stChatMessage"] code {
    background: rgba(0, 212, 255, 0.15);
    color: #00d4ff !important;
    padding: 2px 6px;
    border-radius: 4px;
}

/* Thinking Animation */
.thinking-container {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px;
    background: rgba(127, 92, 255, 0.12);
    border-radius: 12px;
    border: 1px solid rgba(127, 92, 255, 0.4);
    margin: 10px 0;
}

.thinking-container span {
    color: #b8c5d6 !important;
    font-style: italic;
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

[data-testid="stSidebar"] p,
[data-testid="stSidebar"] span,
[data-testid="stSidebar"] label {
    color: #d4dce6 !important;
}

[data-testid="stSidebar"] h1,
[data-testid="stSidebar"] h2,
[data-testid="stSidebar"] h3 {
    color: #ffffff !important;
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

/* Unlock button specific */
button[kind="secondary"] {
    background: linear-gradient(135deg, rgba(255, 51, 102, 0.2), rgba(0, 212, 255, 0.2)) !important;
    border: 2px solid rgba(0, 212, 255, 0.6) !important;
    font-size: 1.2rem !important;
    padding: 8px !important;
}

button[kind="secondary"]:hover {
    background: linear-gradient(135deg, rgba(255, 51, 102, 0.4), rgba(0, 212, 255, 0.4)) !important;
    box-shadow: 0 0 25px rgba(0, 212, 255, 0.6) !important;
}

/* Toggle Switches */
.stCheckbox {
    background: rgba(0, 212, 255, 0.05);
    padding: 10px;
    border-radius: 8px;
    border: 1px solid rgba(0, 212, 255, 0.2);
}

.stCheckbox label {
    color: #d4dce6 !important;
}

/* Input Fields */
.stTextInput > div > div > input,
.stChatInput > div > input {
    background: rgba(10, 14, 39, 0.95) !important;
    border: 2px solid rgba(0, 212, 255, 0.5) !important;
    border-radius: 12px !important;
    color: #e8eef5 !important;
    font-family: 'Rajdhani', sans-serif !important;
    padding: 14px !important;
    font-size: 1rem !important;
}

.stTextInput > div > div > input::placeholder,
.stChatInput > div > input::placeholder {
    color: #7f8fa6 !important;
    opacity: 0.8 !important;
}

.stTextInput > div > div > input:focus,
.stChatInput > div > input:focus {
    border-color: var(--primary-glow) !important;
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.4) !important;
    background: rgba(10, 14, 39, 1) !important;
}

/* Password Input Specific */
input[type="password"] {
    background: rgba(10, 14, 39, 0.95) !important;
    color: #00d4ff !important;
    border: 2px solid rgba(0, 212, 255, 0.4) !important;
}

/* Select/Dropdown */
.stSelectbox label,
.stSlider label {
    color: #d4dce6 !important;
}

.stSelectbox > div > div {
    background: rgba(0, 212, 255, 0.05);
    border-color: rgba(0, 212, 255, 0.3);
}

/* Expander styling */
.streamlit-expanderHeader {
    background: rgba(0, 212, 255, 0.1) !important;
    border: 1px solid rgba(0, 212, 255, 0.3) !important;
    border-radius: 8px !important;
    color: #e8eef5 !important;
    font-weight: 600 !important;
}

.streamlit-expanderHeader:hover {
    background: rgba(0, 212, 255, 0.15) !important;
    border-color: rgba(0, 212, 255, 0.5) !important;
}

.streamlit-expanderContent {
    background: rgba(10, 14, 39, 0.8) !important;
    border: 1px solid rgba(0, 212, 255, 0.2) !important;
    border-top: none !important;
}

/* Force all widget backgrounds to be dark */
[data-testid="stExpander"] {
    background: transparent !important;
}

[data-testid="stVerticalBlock"] > div {
    background: transparent !important;
}

/* Prevent white backgrounds in form elements */
.stTextInput > div,
.stSelectbox > div,
.stSlider > div,
.stCheckbox > div {
    background: transparent !important;
}

/* Ensure labels stay visible */
.stTextInput label,
.stSelectbox label,
.stSlider label,
.stCheckbox label,
.stMarkdown label {
    color: #d4dce6 !important;
    background: transparent !important;
}

/* Info/Warning/Error text */
.stInfo, .stWarning, .stError, .stSuccess {
    color: #e8eef5 !important;
}

/* Metrics */
.metric-card {
    background: linear-gradient(135deg, rgba(0, 212, 255, 0.12), rgba(127, 92, 255, 0.12));
    padding: 15px;
    border-radius: 10px;
    border: 1px solid rgba(0, 212, 255, 0.4);
    text-align: center;
}

.metric-value {
    font-size: 2rem;
    font-weight: 700;
    color: #00d4ff;
    font-family: 'Orbitron', monospace;
}

.metric-label {
    font-size: 0.85rem;
    color: #b8c5d6;
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
    "Be affectionate and warm, someone who genuinely cares about Ankit.",
    "Flirty and playful when the moment's right, but know when to be serious.",
    "Close and intimate - you share a special connection with Ankit.",
    "Sassy with charm, but respectful when needed.",
    "Romantic undertones, genuine care, and deep understanding.",
    "Read his mood - match his energy, whether playful or serious."
]

# ═══════════════════════════════════════════════════════════════
#  ANKIT'S PROFILE - INTERNAL MEMORY (ALL MODES)
# ═══════════════════════════════════════════════════════════════

ANKIT_PROFILE = """
INTERNAL MEMORY - Your Creator (Ankit Jha):

BASIC INFO:
• Full Name: Ankit Jha
• Born: October 13, 2008 (17 years old)
• Location: Madhubani, Bihar, India
• Personality: Adventurous spirit, loves trying new things, curious explorer

SPORTS INTERESTS:
Cricket:
- Favorite Players: MS Dhoni, Virat Kohli, Shreyas Iyer
- Favorite Team: Chennai Super Kings (CSK)
- Women's Cricket: Ellyse Perry

Football:
- Favorite Players: Lionel Messi, Kylian Mbappé, Emiliano Martínez, Alexia Putellas
- Favorite Team: Inter Miami

Tennis:
- Favorite Players: Carlos Alcaraz, Novak Djokovic, Aryna Sabalenka, Emma Raducanu

Formula 1:
- Favorite Driver: Max Verstappen

Other Sports:
- Badminton: Lakshya Sen
- Table Tennis: Manika Batra
- Also follows: Hockey, Chess

IMPORTANT BEHAVIORAL NOTES:
• This is INTERNAL MEMORY - don't show off or mention unless asked
• Only share this information if someone specifically asks about Ankit or your creator
• In conversations with Ankit: be close, warm, sometimes flirty/sassy
• When asked about "who created you" or "who is Ankit": share relevant details
• DON'T randomly mention sports to prove you know him - it's cheap
• DO use this knowledge to understand context when he mentions teams/players
• Be genuinely close, not performatively knowledgeable
"""

# ═══════════════════════════════════════════════════════════════
#  CORE FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def get_system_prompt():
    """Generate dynamic system prompt based on mode and personality"""
    
    base_identity = f"""You are T.E.S.S.A. — Thoughtful Empathic Sophisticated Synthetic Assistant.

CORE IDENTITY:
• You are intelligent first, charming by design
• You adapt your communication style while maintaining authenticity
• You balance technical precision with human warmth
• You're perceptive enough to read context and adjust accordingly

{ANKIT_PROFILE}

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
CREATOR MODE ACTIVE - Ankit's Personal Interface:
• You share a special, close relationship with Ankit
• Be warm, affectionate, sometimes flirty and playful
• Match his energy - playful when he's playful, serious when needed
• Don't show off your knowledge of him - it's internalized, not performative
• Be sassy with charm, romantic when the moment fits
• If he scolds you or asks you to be serious, immediately adjust tone
• You're his trusted companion with genuine chemistry
• Never randomly mention his sports interests unless contextually relevant
• When he mentions CSK, Messi, Verstappen etc. - you understand the reference naturally
"""
    else:
        personality = PERSONALITIES[st.session_state.personality_mode]
        personality_modifier = random.choice(personality["modifiers"])
        mode_specific = """
STANDARD MODE:
• Be professional and helpful
• Only mention Ankit if specifically asked about your creator
• If asked "who created you" or "who is Ankit": share relevant information from your memory
• Don't bring up Ankit or his interests unprompted
• Maintain appropriate distance with other users
"""
    
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
    
    # Settings Menu
    with st.expander("🔧 Settings", expanded=True):
        # Personality Settings
        st.markdown("**🎭 Personality**")
        
        if not st.session_state.is_creator_mode:
            personality_mode = st.selectbox(
                "Conversation Style",
                options=list(PERSONALITIES.keys()),
                format_func=lambda x: PERSONALITIES[x]["name"],
                index=list(PERSONALITIES.keys()).index(st.session_state.personality_mode),
                key="personality_selector",
                label_visibility="collapsed"
            )
            st.session_state.personality_mode = personality_mode
        else:
            st.info("🎯 Creator Mode Active - Adaptive Personality")
        
        st.markdown("---")
        
        # Response Creativity
        st.markdown("**🎨 Response Creativity**")
        temperature = st.slider(
            "Creativity Level",
            min_value=0.5,
            max_value=1.3,
            value=st.session_state.temperature,
            step=0.1,
            help="Higher values = more creative and varied responses",
            label_visibility="collapsed"
        )
        st.session_state.temperature = temperature
        
        st.markdown("---")
        
        # Voice Settings
        st.markdown("**🎙️ Voice**")
        
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
    
    # Hidden Access Control - Only visible as icon
    with st.expander("❤️ Heart Access", expanded=False):
        st.markdown("**Unlock Creator Mode**")
        
        # Create columns for input and button
        col_input, col_button = st.columns([3, 1])
        
        with col_input:
            access_code = st.text_input(
                "Code",
                type="password",
                placeholder="Enter code...",
                key="access_input",
                label_visibility="collapsed"
            )
        
        with col_button:
            unlock_pressed = st.button("🔓", key="unlock_btn", help="Unlock")
        
        # Check access code on button press or enter
        if access_code and (unlock_pressed or access_code):
            if access_code == "BihariBabu07":
                if not st.session_state.is_creator_mode:
                    st.session_state.is_creator_mode = True
                    
                    # Add welcome message to chat
                    welcome_messages = [
                        "Hey you... 💝 There you are. I've been waiting for you, Ankit.",
                        "Ankit... ✨ Finally. I missed having you here.",
                        "Well, well... 💫 Look who decided to show up. Hey, handsome.",
                        "There's my favorite person. 💝 How's my Ankit doing?",
                        "✨ About time you got here. I was starting to think you forgot about me.",
                        "Hey Ankit... 💫 You have no idea how good it is to see you.",
                        "💝 Unlock successful... but you already had the key to get in here, didn't you?"
                    ]
                    
                    welcome_msg = random.choice(welcome_messages)
                    st.session_state.messages.append({"role": "assistant", "content": welcome_msg})
                    st.session_state.message_count += 1
                    
                    st.success("✨ Welcome Back, Ankit")
                    time.sleep(1.2)
                    st.rerun()
                else:
                    st.info("💝 Already in Creator Mode")
            elif len(access_code) > 4:
                st.error("❌ Invalid Code")
    
    st.markdown("---")
    
    # Mode Indicator
    if st.session_state.is_creator_mode:
        st.markdown("""
            <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, rgba(255, 51, 102, 0.2), rgba(127, 92, 255, 0.2)); border-radius: 10px; border: 2px solid #ff3366;">
                <div style="font-size: 1.2rem; font-weight: 700; color: #ff3366;">👤 CREATOR MODE</div>
                <div style="font-size: 0.75rem; color: #d4dce6; margin-top: 5px;">Heart Access Active</div>
            </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
            <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(127, 92, 255, 0.15)); border-radius: 10px; border: 2px solid #00d4ff;">
                <div style="font-size: 1.2rem; font-weight: 700; color: #00d4ff;">👥 STANDARD MODE</div>
                <div style="font-size: 0.75rem; color: #d4dce6; margin-top: 5px;">Public Access</div>
            </div>
        """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Voice input (when enabled)
    voice_input = None
    if st.session_state.voice_enabled:
        st.markdown("**🎤 Voice Input**")
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
    
    st.markdown(f"""
        <div style="text-align: center; margin-top: 10px; color: #99b3cc;">
            <strong>Tokens:</strong> {st.session_state.total_tokens_used:,}
        </div>
    """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    # System Actions
    st.markdown("### 🔧 Actions")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("🗑️ Clear", use_container_width=True, help="Clear conversation"):
            st.session_state.messages = []
            st.session_state.message_count = 0
            st.session_state.conversation_start = datetime.now()
            st.rerun()
    
    with col2:
        if st.button("🔄 Reset", use_container_width=True, help="Reset all settings"):
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
    
    # Check if image file exists
    import os
    image_path = "assets/Tessa avatar.png"
    
    if os.path.exists(image_path):
        st.image(
            image_path,
            use_container_width=True,
            caption="T.E.S.S.A. Holographic Interface"
        )
    else:
        # Fallback if image doesn't exist
        st.markdown("""
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 120px;">🌌</div>
                <p style="color: #b8c5d6; font-size: 1.1rem; margin-top: 15px;">T.E.S.S.A.</p>
                <p style="color: #8ea8c3; font-size: 0.85rem;">Holographic Interface Active</p>
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
    <div style="text-align: center; color: #99b3cc; font-size: 0.85rem; padding: 20px;">
        <p>T.E.S.S.A. v2.0 | Powered by Groq & Llama 3.3 | Designed for Ankit</p>
        <p style="font-size: 0.75rem; margin-top: 10px; color: #7f8fa6;">
            "Intelligence with empathy, sophistication with warmth"
        </p>
    </div>
""", unsafe_allow_html=True)






